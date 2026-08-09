import express from 'express';
import readUsersRouter from './users/read/handler';
import createUser from './users/create/handler';
import updateUser from './users/update/handler';
import deleteUser from './users/delete/handler';

const router = express.Router();

router.use('/', readUsersRouter);
router.post('/', createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
