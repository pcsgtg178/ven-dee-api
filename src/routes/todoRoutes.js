import { Router } from 'express';
import { createShiftTodo, createServiceTodo } from '../controllers/todoController.js';
import { validate } from '../middlewares/validate.js';
import { createShiftTodoSchema, createServiceTodoSchema } from '../validators/todoValidator.js';

const router = Router();

router.post('/shift', validate(createShiftTodoSchema), createShiftTodo);
router.post('/service', validate(createServiceTodoSchema), createServiceTodo);

export default router;
