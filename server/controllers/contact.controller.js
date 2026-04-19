const Contact = require("../models/contact.model");
const User = require("../models/user.model");

function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

exports.submitContact = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message?.trim()) return res.status(400).json({ message: "Message is required" });
    if (message.trim().length < 10)
      return res.status(400).json({ message: "Message must be at least 10 characters" });

    const user = await User.findById(req.user.id);
    if (!user || !["CUSTOMER", "PARTNER"].includes(user.role)) {
      return res.status(403).json({ message: "Only customer or partner can send support messages" });
    }

    const safeEmail = user.email && isValidEmail(user.email.trim())
      ? user.email.trim()
      : `${String(user.mobile || user.id).replace(/\s+/g, "")}@ondemand.local`;

    const id = await Contact.createContact({
      userId: user.id,
      userRole: user.role,
      name: user.name,
      email: safeEmail,
      message: message.trim(),
    });

    res.status(201).json({ message: "Message sent", id });
  } catch (err) {
    next(err);
  }
};

exports.myContacts = async (req, res, next) => {
  try {
    const messages = await Contact.getContactsByUser(req.user.id);
    const replies = await Contact.getRepliesByContactIds(messages.map((item) => item.id));

    const replyMap = replies.reduce((acc, row) => {
      if (!acc[row.contact_message_id]) {
        acc[row.contact_message_id] = [];
      }
      acc[row.contact_message_id].push(row);
      return acc;
    }, {});

    const data = messages.map((item) => ({
      ...item,
      replies: replyMap[item.id] || []
    }));

    res.json({ data });
  } catch (err) {
    next(err);
  }
};
