import express from "express";
import db from "../db.js";

const router = express.Router();

// Global search endpoint
router.get("/", (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.json({ candidates: [], interviews: [], meetings: [], vehicles: [], bookings: [] });
  }

  const searchTerm = `%${q}%`;
  const results = {
    candidates: [],
    interviews: [],
    meetings: [],
    vehicles: [],
    bookings: []
  };

  // Search candidates
  const candidatesQuery = `
    SELECT id, first_name, last_name, email, phone, suitability
    FROM candidates
    WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?
    LIMIT 10
  `;

  // Search interviews
  const interviewsQuery = `
    SELECT i.id, i.scheduled_at, i.location, i.status, c.first_name, c.last_name, c.id as candidate_id
    FROM interviews i
    JOIN candidates c ON i.candidate_id = c.id
    WHERE c.first_name LIKE ? OR c.last_name LIKE ? OR i.location LIKE ?
    ORDER BY i.scheduled_at DESC
    LIMIT 10
  `;

  // Search meetings
  const meetingsQuery = `
    SELECT m.id, m.title, m.start_time, m.end_time, m.organizer, r.name as room_name, r.color as room_color
    FROM room_meetings m
    JOIN rooms r ON m.room_id = r.id
    WHERE m.title LIKE ? OR m.organizer LIKE ? OR r.name LIKE ?
    ORDER BY m.start_time DESC
    LIMIT 10
  `;

  // Search vehicles
  const vehiclesQuery = `
    SELECT id, plate, brand, model, fuel_type, color
    FROM vehicles
    WHERE plate LIKE ? OR brand LIKE ? OR model LIKE ?
    LIMIT 10
  `;

  // Search vehicle bookings
  const bookingsQuery = `
    SELECT b.id, b.driver_name, b.destination, b.start_time, v.plate, v.brand, v.model, v.color as vehicle_color
    FROM vehicle_bookings b
    JOIN vehicles v ON b.vehicle_id = v.id
    WHERE b.driver_name LIKE ? OR b.destination LIKE ? OR v.plate LIKE ?
    ORDER BY b.start_time DESC
    LIMIT 10
  `;

  // Execute all queries in parallel
  let completed = 0;
  const checkComplete = () => {
    completed++;
    if (completed === 5) {
      res.json(results);
    }
  };

  db.all(candidatesQuery, [searchTerm, searchTerm, searchTerm, searchTerm], (err, rows) => {
    if (!err) results.candidates = rows || [];
    checkComplete();
  });

  db.all(interviewsQuery, [searchTerm, searchTerm, searchTerm], (err, rows) => {
    if (!err) results.interviews = rows || [];
    checkComplete();
  });

  db.all(meetingsQuery, [searchTerm, searchTerm, searchTerm], (err, rows) => {
    if (!err) results.meetings = rows || [];
    checkComplete();
  });

  db.all(vehiclesQuery, [searchTerm, searchTerm, searchTerm], (err, rows) => {
    if (!err) results.vehicles = rows || [];
    checkComplete();
  });

  db.all(bookingsQuery, [searchTerm, searchTerm, searchTerm], (err, rows) => {
    if (!err) results.bookings = rows || [];
    checkComplete();
  });
});

export default router;
