const router = require('express').Router();
const handle = require('../handlers');

// Account lists are not exposed publicly.
router.post('/login', handle.login);
router.post('/register', handle.register);

module.exports = router;
