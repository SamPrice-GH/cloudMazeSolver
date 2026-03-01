const express = require('express');
const router = express.Router();

const solveController = require('../controllers/solveController'); 
const { optionalAuth, adminAuth } = require('../middleware/authMiddleware');

// get supported algos
router.get('/algos', optionalAuth, solveController.supported_algos);

// solve a maze
router.get('/maze/:id', optionalAuth, solveController.solve_maze);

// get all solves
router.get('/', optionalAuth, solveController.solve_list);

router.route('/:id')
    .get(optionalAuth, solveController.get_solve_by_id) // get solve by ID
    .delete(adminAuth, solveController.delete_solve); // delete solve

// save solve
router.post('/save', optionalAuth, solveController.save_solve);

module.exports = router;
