import { readDB, writeDB } from '../../../../lib/store.js';
import { jsonError, jsonOk } from '../../../../lib/auth.js';
import { STATUS, uid, newBookingRef, clean, isEmail, isPastDate, audit } from '../../../../lib/domain.js';

export async function POST(req) {
  let body; try { body = await req.json(); } catch { return jsonError('Invalid request body'); }
  const contact = {
    name: clean(body?.contact?.name, 120), phone: clean(body?.contact?.phone, 40),
    email: clean(body?.contact?.email, 200).toLowerCase(),
  };
  const trip = {
    type: body?.trip?.type === 'return' ? 'return' : 'oneway',
    from: clean(body?.trip?.from, 120), to: clean(body?.trip?.to, 120),
    departDate: clean(body?.trip?.departDate, 10), returnDate: clean(body?.trip?.returnDate, 10),
    cabin: ['Economy', 'Business', 'First'].includes(body?.trip?.cabin) ? body.trip.cabin : 'Economy',
    notes: clean(body?.trip?.notes, 1000),
  };
  const passengersIn = Array.isArray(body?.passengers) ? body.passengers.slice(0, 9) : [];
  const passengers = passengersIn.map(p => ({
    id: uid('pax'), fullName: clean(p?.fullName, 120), dob: clean(p?.dob, 10),
    gender: ['Female', 'Male'].includes(p?.gender) ? p.gender : '',
    nationality: clean(p?.nationality, 80) || 'Ethiopian',
    passportNo: clean(p?.passportNo, 40).toUpperCase(), passportExpiry: clean(p?.passportExpiry, 10),
    type: ['ADULT', 'CHILD', 'INFANT'].includes(p?.type) ? p.type : 'ADULT',
  }));

  if (!contact.name || !contact.phone || !isEmail(contact.email)) return jsonError('Please provide your name, phone and a valid email.');
  if (!trip.from || !trip.to || trip.from.toLowerCase() === trip.to.toLowerCase()) return jsonError('Please provide different departure and destination cities.');
  if (isPastDate(trip.departDate)) return jsonError('Departure date must be today or later.');
  if (trip.type === 'return' && (!trip.returnDate || trip.returnDate < trip.departDate)) return jsonError('Return date must be on or after the departure date.');
  if (passengers.length < 1 || passengers.some(p => !p.fullName)) return jsonError('Please add at least one passenger full name.');

  const db = await readDB();
  // Basic duplicate guard: same email + route + date created in last 5 minutes
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  const dup = db.bookings.some(b => b.contact.email === contact.email && b.trip.from === trip.from && b.trip.to === trip.to
    && b.trip.departDate === trip.departDate && new Date(b.createdAt).getTime() > fiveMinAgo);
  if (dup) return jsonError('A similar request was just submitted. Please use Track booking to follow it.', 409);

  const existing = new Set(db.bookings.map(b => b.ref));
  const now = new Date().toISOString();
  const booking = {
    id: uid('bk'), ref: newBookingRef(existing), status: STATUS.NEW,
    createdAt: now, updatedAt: now, contact, trip, passengers,
    assignedTo: null, flights: [], payments: [], messages: [], ticket: null,
    language: body?.language === 'am' ? 'am' : 'en', audit: [],
  };
  audit(booking, 'customer', 'REQUEST_SUBMITTED', `${trip.from} -> ${trip.to} on ${trip.departDate}`);
  db.bookings.push(booking);
  await writeDB(db);
  return jsonOk({ ref: booking.ref, message: 'Request received' }, 201);
}
