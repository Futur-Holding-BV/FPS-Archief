import { Router, type IRouter } from "express";
import archiveRouter from "./archive";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(archiveRouter);

export default router;
