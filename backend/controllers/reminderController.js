// backend/controllers/reminderController.js
const MedicineReminder = require('../models/MedicineReminder');

// @desc    Get all reminders for patient
// @route   GET /api/reminders
const getReminders = async (req, res, next) => {
  try {
    const reminders = await MedicineReminder.find({ patientId: req.user._id })
      .populate('prescriptionId', 'diagnosis')
      .sort({ createdAt: -1 });
    res.json(reminders);
  } catch (error) {
    next(error);
  }
};

// @desc    Create reminder
// @route   POST /api/reminders
const createReminder = async (req, res, next) => {
  try {
    const { prescriptionId, medicineName, dosage, times, daysOfWeek, startDate, endDate, instructions } = req.body;

    if (!medicineName || !dosage || !times?.length || !startDate) {
      return res.status(400).json({ error: 'Medicine name, dosage, times, and start date are required' });
    }

    const reminder = await MedicineReminder.create({
      patientId: req.user._id,
      prescriptionId,
      medicineName,
      dosage,
      times,
      daysOfWeek: daysOfWeek || [],
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      instructions,
    });

    res.status(201).json(reminder);
  } catch (error) {
    next(error);
  }
};

// @desc    Update reminder
// @route   PUT /api/reminders/:id
const updateReminder = async (req, res, next) => {
  try {
    const reminder = await MedicineReminder.findOne({ _id: req.params.id, patientId: req.user._id });
    if (!reminder) return res.status(404).json({ error: 'Reminder not found' });

    const allowedFields = ['medicineName', 'dosage', 'times', 'daysOfWeek', 'startDate', 'endDate', 'instructions', 'isActive'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) reminder[field] = req.body[field];
    });

    await reminder.save();
    res.json(reminder);
  } catch (error) {
    next(error);
  }
};

// @desc    Log medicine taken/missed
// @route   POST /api/reminders/:id/log
const logMedicine = async (req, res, next) => {
  try {
    const reminder = await MedicineReminder.findOne({ _id: req.params.id, patientId: req.user._id });
    if (!reminder) return res.status(404).json({ error: 'Reminder not found' });

    const { scheduledTime, status, note } = req.body;
    reminder.logs.push({
      scheduledTime: new Date(scheduledTime),
      takenAt: status === 'taken' ? new Date() : undefined,
      status,
      note,
    });
    await reminder.save();
    res.json({ success: true, reminder });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete reminder
// @route   DELETE /api/reminders/:id
const deleteReminder = async (req, res, next) => {
  try {
    const reminder = await MedicineReminder.findOneAndDelete({ _id: req.params.id, patientId: req.user._id });
    if (!reminder) return res.status(404).json({ error: 'Reminder not found' });
    res.json({ success: true, message: 'Reminder deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get today's schedule
// @route   GET /api/reminders/today
const getTodaySchedule = async (req, res, next) => {
  try {
    const today = new Date();
    const dayOfWeek = today.getDay();

    const reminders = await MedicineReminder.find({
      patientId: req.user._id,
      isActive: true,
      startDate: { $lte: today },
      $or: [
        { endDate: { $gte: today } },
        { endDate: { $exists: false } },
      ],
      $or: [
        { daysOfWeek: { $size: 0 } },          // daily (no restriction)
        { daysOfWeek: dayOfWeek },              // today matches
      ],
    });

    res.json(reminders);
  } catch (error) {
    next(error);
  }
};

module.exports = { getReminders, createReminder, updateReminder, logMedicine, deleteReminder, getTodaySchedule };