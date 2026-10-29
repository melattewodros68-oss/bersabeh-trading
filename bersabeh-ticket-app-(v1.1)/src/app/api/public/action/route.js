import { readDB, writeDB } from '../../../../lib/store.js';
import { jsonError, jsonOk } from '../../../../lib/auth.js';
import { STATUS, uid, clean, money, audit, addMessage, publicView, verifyOwnership, totals } from '../../../../lib/domain.js';
import { BUSINESS } from '../../../../lib/config.js';

export async function POST(req) {
  let body; try { body = await req.json(); } catch { return jsonError('Invalid request body'); }
  const db = await readDB();
  const booking = verifyOwnership(db, body?.ref, body?.email);
  if (!booking) return jsonError('Booking not found.', 404);
  const action = body?.action;
  const now = new Date().toISOString();

  if (action === 'approve') {
    if (booking.status !== STATUS.QUOTED) return jsonError('This booking is not waiting for quote approval.');
    booking.status = STATUS.AWAITING_PAYMENT;
    audit(booking, 'customer', 'QUOTE_APPROVED');
    addMessage(booking, 'CUSTOMER', booking.contact.email, 'CUSTOMER', 'I accept the quote. Please send payment instructions.');
  } else if (action === 'reject') {
    if (booking.status !== STATUS.QUOTED) return jsonError('This booking is not waiting for quote approval.');
    booking.status = STATUS.CANCELLED;
    booking.cancelReason = clean(body?.reason, 500) || 'Quote rejected by customer';
    audit(booking, 'customer', 'QUOTE_REJECTED', booking.cancelReason);
  } else if (action === 'claimPayment') {
    if (![STATUS.AWAITING_PAYMENT, STATUS.CONFIRMED].includes(booking.status)) return jsonError('Payment cannot be reported at this stage.');
    const method = BUSINESS.paymentMethods.includes(body?.method) ? body.method : '';
    const amount = money(body?.amount);
    const currency = BUSINESS.currencies.includes(body?.currency) ? body.currency : 'ETB';
    const txnRef = clean(body?.txnRef, 120);
    if (!method || !Number.isFinite(amount) || amount <= 0 || !txnRef) return jsonError('Please provide payment method, a positive amount and the transaction reference.');
    if ((booking.payments || []).some(p => p.ref === txnRef && p.status !== 'REJECTED')) return jsonError('This transaction reference was already submitted.', 409);
    booking.payments.push({ id: uid('pay'), method, amount, currency, ref: txnRef, status: 'CLAIMED', at: now, note: 'Reported by customer — awaiting agent verification' });
    audit(booking, 'customer', 'PAYMENT_CLAIMED', `${method} ${amount} ${currency} ref ${txnRef}`);
    addMessage(booking, 'CUSTOMER', booking.contact.email, 'CUSTOMER', `Payment sent via ${method}: ${amount} ${currency}. Reference: ${txnRef}. Please verify.`);
  } else if (action === 'message') {
    const text = clean(body?.text, 2000);
    if (!text) return jsonError('Message is empty.');
    if (booking.status === STATUS.CANCELLED) return jsonError('This booking is cancelled.');
    addMessage(booking, 'CUSTOMER', booking.contact.email, 'CUSTOMER', text);
    audit(booking, 'customer', 'CUSTOMER_MESSAGE');
  } else {
    return jsonError('Unknown action.');
  }

  booking.updatedAt = now;
  await writeDB(db);
  return jsonOk({ booking: publicView(booking), totals: totals(booking) });
}
