const express = require("express");
const router = express.Router();

const { optionalAuth, forceAuth, adminAuth } = require('../middleware/authMiddleware');
const mazeController = require("../controllers/mazeController");

// Maze Routes

router.get("/", optionalAuth, mazeController.maze_list);

router.get('/:id', optionalAuth, mazeController.get_maze_by_id);

router.get('/:id/file', optionalAuth, mazeController.get_maze_file);

router.post("/create", optionalAuth, mazeController.maze_create);

router.delete('/delete/:id', adminAuth, mazeController.delete_maze);

module.exports = router;