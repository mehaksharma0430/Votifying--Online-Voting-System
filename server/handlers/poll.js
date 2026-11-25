const db = require('../models');

exports.showPolls = async (req, res, next) => {
  try {
    const polls = await db.Poll.find({ archived: { $ne: true } }).populate('user', ['username', 'id']);
    // .populate('voted', ['username', 'id']);

    return res.status(200).json(polls);
  } catch (err) {
    return next({
      status: 400,
      message: err.message,
    });
  }
};

exports.usersPolls = async (req, res, next) => {
  const { id } = req.decoded;
  try {
    const user = await db.User.findById(id).populate('polls');

    return res.status(200).json(user.polls);
  } catch (err) {
    return next({
      status: 400,
      message: err.message,
    });
  }
};

exports.createPoll = async (req, res, next) => {
  const { id } = req.decoded;
  const { question, options, description, category, action } = req.body;
  try {
    if (typeof question !== 'string' || !question.trim() || question.length > 180 || !Array.isArray(options) || options.length < 2 || options.length > 6 || options.some(o => typeof o !== 'string' || !o.trim() || o.length > 160) || new Set(options.map(o => o.trim().toLowerCase())).size !== options.length) throw new Error('Provide a question and 2–6 distinct, non-empty options.');
    if (description && (typeof description !== 'string' || description.length > 1000)) throw new Error('Description must be under 1000 characters.');
    if (action && (typeof action !== 'string' || action.length > 600)) throw new Error('Next step must be under 600 characters.');
    const user = await db.User.findById(id);
    const poll = await db.Poll.create({
      question: question.trim(),
      description, category, action,
      user,
      options: options.map(option => ({ option: option.trim(), votes: 0 })),
    });
    user.polls.push(poll._id);
    await user.save();

    return res.status(201).json({ ...poll._doc, user: user._id });
  } catch (err) {
    return next({
      status: 400,
      message: err.message,
    });
  }
};

exports.vote = async (req, res, next) => {
  try {
    const { answer } = req.body;
    if (typeof answer !== 'string' || !answer.trim()) throw new Error('Choose an option to vote.');
    const poll = await db.Poll.findOneAndUpdate(
      { _id: req.params.id, archived: { $ne: true }, voted: { $ne: req.decoded.id }, 'options.option': answer },
      { $inc: { 'options.$.votes': 1 }, $addToSet: { voted: req.decoded.id } },
      { new: true, useFindAndModify: false }
    );
    if (!poll) throw new Error('Vote not accepted: you may have already voted, or this option is unavailable.');
    return res.status(202).json(poll);
  } catch (err) { return next({ status: 400, message: err.message }); }
};

exports.getPoll = async (req, res, next) => {
  try {
    const { id } = req.params;
    const poll = await db.Poll.findById(id).populate('user', [
      'username',
      'id',
    ]);
    // .populate('voted', ['username', 'id']);
    if (!poll) throw new Error('No poll found');

    return res.status(200).json(poll);
  } catch (err) {
    return next({
      status: 400,
      message: err.message,
    });
  }
};

exports.deletePoll = async (req, res, next) => {
  const { id: pollId } = req.params;
  const { id: userId } = req.decoded;
  try {
    let user = await db.User.findById(userId)
    if(user.polls) { // not sure if necessary either...
      user.polls = user.polls.filter(userPoll => {
        return userPoll._id.toString() !== pollId.toString() // not sure if necessary to use toString()
      })
    }
    
    const poll = await db.Poll.findById(pollId);
    if (!poll) throw new Error('No poll found');
    if (poll.user.toString() !== userId) {
      throw new Error('Unauthorized access');
    }
    await user.save()
    await poll.remove();
    return res.status(202).json({ poll, deleted: true });
  } catch (err) {
    return next({
      status: 400,
      message: err.message,
    });
  }
};
