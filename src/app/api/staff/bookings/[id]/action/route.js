import { readDB, writeDB } from '../../../../../../lib/store.js';
import { requireStaff, jsonError, jsonOk } from '../../../../../../lib/auth.js';
import { STATUS, uid, clean, money, audit, addMessage, totals, evaluatePreapproval, newAccessToken } from '../../../../../../lib/domain.js';
import { BUSINESS } from '../../../../../../lib/config.js';

function canMutate(user, booking) {
  if (user.role === 'ADMIN') return true;
  return !booking.assignedTo || booking.assignedTo === user.email;
}
function maybeConfirm(booking, actor) {
  const t = totals(booking);
  if (booking.status === STATUS.AWAITING_PAYMENT && t.fullyPaid) {
    booking.status = STATUS.CONFIRMED;
    audit(booking, actor, 'FULLY_PAID', 'Balance reached zero — booking CONFIRMED, ready to ticket');
  }
  return t;
}

export async function POST(req, context) {
  const { user, error } = await requireStaff(req, ['AGENT', 'ADMIN']);
  if (error) return error;
  const { id } = await context.params;
  let body; try { body = await req.json(); } catch { return jsonError('Invalid request body'); }
  const db = await readDB();
  const booking = db.bookings.find(b => b.id === id || b.ref === id);
  if (!booking) return jsonError('Booking not found', 404);
  if (!canMutate(user, booking)) return jsonError('This booking is assigned to another agent. Ask an admin to reassign it.', 403);
  const action = body?.action;
  const actor = user.email;
  const now = new Date().toISOString();

  if (action === 'newLink') {
    booking.accessToken = newAccessToken()
    audit(booking, actor, 'LIVE_LINK_RENEWED', 'Previous customer live link disabled and a new one created');
  } else if (action === 'assign') {
    if (booking.assignedTo && booking.assignedTo !== user.email && user.role !== 'ADMIN') return jsonError('Already assigned to another agent.', 409);
    const target = user.role === 'ADMIN' && body?.agentEmail ? clean(body.agentEmail, 200).toLowerCase() : user.email;
    if (user.role === 'ADMIN' && body?.agentEmail && !db.users.some(u => u.email.toLowerCase() === target && u.active)) return jsonError('Target agent not found or inactive.');
    booking.assignedTo = target;
    if (booking.status === STATUS.NEW) booking.status = STATUS.UNDER_REVIEW;
    audit(booking, actor, 'ASSIGNED', 'Assigned to ' + target);
  } else if (action === 'addFlight') {
    if (![STATUS.UNDER_REVIEW, STATUS.QUOTED].includes(booking.status)) return jsonError('Flights can only be added while Under review (assign the booking first).');
    const f = body?.flight || {};
    const priceTotal = money(f.priceTotal);
    const flight = {
      id: uid('flt'), airline: clean(f.airline, 80), flightNo: clean(f.flightNo, 30).toUpperCase(),
      from: clean(f.from, 120), to: clean(f.to, 120), departDate: clean(f.departDate, 10), departTime: clean(f.departTime, 10),
      arriveDate: clean(f.arriveDate, 10), arriveTime: clean(f.arriveTime, 10),
      baggage: clean(f.baggage, 80), stopover: clean(f.stopover, 120) || 'Direct',
      fareClass: clean(f.fareClass, 40) || booking.trip.cabin, priceTotal,
      currency: BUSINESS.currencies.includes(f.currency) ? f.currency : 'ETB',
      deadline: clean(f.deadline, 40), notes: clean(f.notes, 500),
    };
    if (!flight.airline || !flight.flightNo || !flight.from || !flight.to || !flight.departDate) return jsonError('Flight needs airline, flight number, route and departure date.');
    if (!Number.isFinite(priceTotal) || priceTotal <= 0) return jsonError('Total price must be greater than zero.');
    booking.flights.push(flight);
    booking.approvalCheck = null;
    audit(booking, actor, 'FLIGHT_ADDED', `${flight.airline} ${flight.flightNo} ${flight.from}->${flight.to} ${priceTotal} ${flight.currency} (total, all passengers)`);
    if (booking.status === STATUS.QUOTED) addMessage(booking, user.role, actor, 'CUSTOMER', 'We have updated your flight offer — please review the itinerary and total below.');
  } else if (action === 'deleteFlight') {
    if (![STATUS.UNDER_REVIEW, STATUS.QUOTED].includes(booking.status)) return jsonError('Flights cannot be changed at this stage.');
    booking.flights = (booking.flights || []).filter(f => f.id !== body?.flightId);
    booking.approvalCheck = null;
    audit(booking, actor, 'FLIGHT_REMOVED', String(body?.flightId || ''));
  } else if (action === 'sendQuote') {
    if (booking.status !== STATUS.UNDER_REVIEW) return jsonError('Quote can only be sent from Under review.');
    if (!(booking.flights || []).length) return jsonError('Add at least one flight before sending a quote.');
    const note = clean(body?.note, 1000);
    const t = totals(booking);
    const totalText = Object.entries(t.byCurrency).map(([c, v]) => `${v.quoted} ${c}`).join(', ');
    if (!booking.accessToken) booking.accessToken = newAccessToken()
    const check = evaluatePreapproval(booking);
    booking.approvalCheck = check;
    audit(booking, actor, 'QUOTE_SENT', totalText);
    if (check.eligible) {
      booking.status = STATUS.AWAITING_PAYMENT;
      booking.autoApprovedAt = now;
      audit(booking, 'customer', 'QUOTE_AUTO_APPROVED',
        `Quote ${totalText} matched the customer's approval up to ${check.maxTotal} ${check.currency}`);
      addMessage(booking, user.role, actor, 'CUSTOMER',
        `Good news: your flight matches the approval you gave us. Total for all passengers: ${totalText}. No separate Accept step is needed. Please pay the exact total using Telebirr or CBE, then enter the transaction reference on this same page.${note ? ' Agent note: ' + note : ''}`);
    } else {
      booking.status = STATUS.QUOTED;
      booking.autoApprovedAt = null;
      if (check.mode === 'PREAPPROVED') {
        audit(booking, actor, 'QUOTE_PREAPPROVAL_NOT_MATCHED', check.reasons.join('; '));
        addMessage(booking, user.role, actor, 'CUSTOMER',
          `Your flight quote is ready, but something is different from the approval you gave us. Total for all passengers: ${totalText}. Please review the itinerary on this page and Accept only if you agree.${note ? ' Agent note: ' + note : ''}`);
      } else {
        addMessage(booking, user.role, actor, 'CUSTOMER',
          `Your flight quote is ready. Total for all passengers: ${totalText}. Please review the full itinerary on this page and Accept to proceed to payment.${note ? ' Agent note: ' + note : ''}`);
      }
    }
  } else if (action === 'recordPayment') {
    if (![STATUS.AWAITING_PAYMENT, STATUS.CONFIRMED].includes(booking.status)) return jsonError('Payments can only be recorded after the customer accepted the quote.');
    const amount = money(body?.amount);
    const method = BUSINESS.paymentMethods.includes(body?.method) ? body.method : '';
    const currency = BUSINESS.currencies.includes(body?.currency) ? body.currency : 'ETB';
    const txnRef = clean(body?.txnRef, 120);
    if (!method || !Number.isFinite(amount) || amount <= 0) return jsonError('Provide a method and a positive amount.');
    booking.payments.push({ id: uid('pay'), method, amount, currency, ref: txnRef, status: 'CONFIRMED', at: now, note: 'Recorded & verified by ' + actor });
    audit(booking, actor, 'PAYMENT_RECORDED', `${method} ${amount} ${currency} ref ${txnRef || '-'}`);
    maybeConfirm(booking, actor);
  } else if (action === 'confirmPayment') {
    const p = (booking.payments || []).find(x => x.id === body?.paymentId);
    if (!p) return jsonError('Payment not found', 404);
    if (p.status !== 'CLAIMED') return jsonError('Only claimed payments can be confirmed.');
    p.status = 'CONFIRMED'; p.note = 'Verified by ' + actor;
    audit(booking, actor, 'PAYMENT_CONFIRMED', `${p.method} ${p.amount} ${p.currency} ref ${p.ref}`);
    maybeConfirm(booking, actor);
  } else if (action === 'rejectPayment') {
    const p = (booking.payments || []).find(x => x.id === body?.paymentId);
    if (!p) return jsonError('Payment not found', 404);
    if (p.status !== 'CLAIMED') return jsonError('Only claimed payments can be rejected.');
    p.status = 'REJECTED'; p.note = 'Rejected by ' + actor + (body?.reason ? ': ' + clean(body.reason, 300) : '');
    audit(booking, actor, 'PAYMENT_REJECTED', `${p.method} ${p.amount} ${p.currency} ref ${p.ref}`);
    addMessage(booking, user.role, actor, 'CUSTOMER', `We could not verify the payment reference ${p.ref}. Please check it and resubmit, or contact us on WhatsApp.`);
  } else if (action === 'issueTicket') {
    if (booking.status !== STATUS.CONFIRMED) return jsonError('Ticket can only be issued after payment is fully confirmed.');
    const t = totals(booking);
    if (!t.fullyPaid) return jsonError('Balance is not zero in every currency. Confirm the missing payment first.');
    const pnr = clean(body?.pnr, 20).toUpperCase();
    const numbers = Array.isArray(body?.ticketNumbers) ? body.ticketNumbers : [];
    if (pnr.length < 5) return jsonError('Enter the airline PNR / record locator.');
    if (numbers.length !== (booking.passengers || []).length || numbers.some(n => !clean(n?.ticketNo, 30))) {
      return jsonError('Enter an e-ticket number for every passenger.');
    }
    booking.ticket = {
      pnr, issuedAt: now, issuedBy: actor,
      numbers: booking.passengers.map((p, i) => ({ passenger: p.fullName, ticketNo: clean(numbers[i]?.ticketNo, 30) })),
    };
    booking.status = STATUS.ISSUED;
    audit(booking, actor, 'TICKET_ISSUED', 'PNR ' + pnr);
    addMessage(booking, user.role, actor, 'CUSTOMER', `Your ticket has been issued. Airline reference (PNR): ${pnr}. See your e-ticket details on this page and please arrive at the airport early. Safe travels!`);
  } else if (action === 'cancel') {
    if (booking.status === STATUS.ISSUED && user.role !== 'ADMIN') return jsonError('Issued tickets can only be cancelled/voided by an admin (refund rules apply).', 403);
    if (booking.status === STATUS.CANCELLED) return jsonError('Already cancelled.');
    booking.status = STATUS.CANCELLED;
    booking.cancelReason = clean(body?.reason, 500) || 'Cancelled by office';
    audit(booking, actor, 'CANCELLED', booking.cancelReason);
    addMessage(booking, user.role, actor, 'CUSTOMER', 'Your booking has been cancelled: ' + booking.cancelReason);
  } else if (action === 'message') {
    const channel = body?.channel === 'INTERNAL' ? 'INTERNAL' : 'CUSTOMER';
    const text = clean(body?.text, 2000);
    if (!text) return jsonError('Message is empty.');
    addMessage(booking, user.role, actor, channel, text);
    audit(booking, actor, channel === 'INTERNAL' ? 'INTERNAL_NOTE' : 'CUSTOMER_MESSAGE_SENT');
  } else {
    return jsonError('Unknown action.');
  }

  booking.updatedAt = now;
  await writeDB(db);
  return jsonOk({ booking, totals: totals(booking) });
}
