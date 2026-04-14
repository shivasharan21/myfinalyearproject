const Reminder = require('../models/Reminder');

const getReminders = async (req, res) => {
  try {
    res.json(await Reminder.find({ userId: req.userId, active: true }).sort({ createdAt: -1 }));
  } catch {
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
};

const getTodayReminders = async (req, res) => {
  try {
    const reminders = await Reminder.find({ userId: req.userId, active: true });
    res.json(reminders);
  } catch {
    res.status(500).json({ error: "Failed to fetch today's reminders" });
  }
};

const createReminder = async (req, res) => {
  try {
    const { medicineName, dosage, times, instructions } = req.body;
    if (!medicineName) return res.status(400).json({ error: 'medicineName is required' });
    const reminder = await new Reminder({
      userId: req.userId, medicineName, dosage, times: times || [], instructions
    }).save();
    res.status(201).json(reminder);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create reminder', details: error.message });
  }
};

const deleteReminder = async (req, res) => {
  try {
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) return res.status(404).json({ error: 'Reminder not found' });
    if (reminder.userId.toString() !== req.userId)
      return res.status(403).json({ error: 'Unauthorized' });
    reminder.active = false;
    await reminder.save();
    res.json({ message: 'Reminder deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete reminder' });
  }
};

const logMedicine = async (req, res) => {
  try {
    const { skipped } = req.body;
    const reminder = await Reminder.findById(req.params.id);
    if (!reminder) return res.status(404).json({ error: 'Reminder not found' });
    if (reminder.userId.toString() !== req.userId)
      return res.status(403).json({ error: 'Unauthorized' });
    reminder.logs.push({ takenAt: new Date(), skipped: skipped || false });
    await reminder.save();
    res.json(reminder);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log medicine', details: error.message });
  }
};

module.exports = { getReminders, getTodayReminders, createReminder, deleteReminder, logMedicine };