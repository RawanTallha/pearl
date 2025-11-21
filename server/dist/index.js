import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';
import { initializeDatabase, listControllers, findControllerById, getSectorRosterForController, getSectorRosterById, listSectorsWithRosters, getShiftSummaryReport, listSupervisorActions, insertSupervisorAction, getBackupCandidate, } from './db/index.js';
import { advanceFrame, getCurrentFrame, resetSimulation, refreshSimulationFrames } from './services/simulation.js';
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: '*',
    },
});
app.use(cors({
    origin: '*',
}));
app.use(express.json());
try {
    initializeDatabase();
    refreshSimulationFrames();
}
catch (error) {
    console.error('Failed to initialize database', error);
    process.exit(1);
}
const supervisorProfile = {
    id: process.env.SUPERVISOR_ID ?? 'S_Sara_001',
    name: process.env.SUPERVISOR_NAME ?? 'Sara',
    password: process.env.SUPERVISOR_PASSWORD ?? 'pearl-secure',
};
const port = process.env.PORT ? Number(process.env.PORT) : 4000;
const simulationInterval = Number(process.env.SIM_INTERVAL_MS ?? 5000);
io.on('connection', (socket) => {
    socket.emit('fatigue:init', getCurrentFrame());
});
setInterval(() => {
    const frame = advanceFrame();
    io.emit('fatigue:update', frame);
}, simulationInterval);
app.get('/health', (_req, res) => {
    const controllerCount = listControllers().length;
    const sectorCount = listSectorsWithRosters().length;
    res.json({
        status: 'ok',
        controllers: controllerCount,
        sectors: sectorCount,
        timestamp: new Date().toISOString(),
    });
});
app.post('/auth/controller', (req, res) => {
    const { controllerId } = req.body;
    if (!controllerId) {
        return res.status(400).json({ error: 'controllerId is required' });
    }
    const profile = findControllerById(controllerId);
    if (!profile) {
        return res.status(404).json({ error: 'Controller not found' });
    }
    return res.json(profile);
});
app.post('/auth/supervisor', (req, res) => {
    const { supervisorId, password } = req.body;
    if (!supervisorId || !password) {
        return res.status(400).json({ error: 'supervisorId and password are required' });
    }
    if (supervisorId !== supervisorProfile.id || password !== supervisorProfile.password) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    return res.json({ id: supervisorProfile.id, name: supervisorProfile.name });
});
app.get('/controllers', (req, res) => {
    const { sectorId } = req.query;
    const list = typeof sectorId === 'string' ? listControllers(sectorId) : listControllers();
    res.json(list);
});
app.get('/controllers/:id', (req, res) => {
    const controller = findControllerById(req.params.id);
    if (!controller) {
        return res.status(404).json({ error: 'Controller not found' });
    }
    res.json(controller);
});
app.get('/controllers/:id/sector', (req, res) => {
    const sector = getSectorRosterForController(req.params.id);
    if (!sector) {
        return res.status(404).json({ error: 'Sector not found for controller' });
    }
    res.json(sector);
});
app.get('/controllers/:id/backup', (req, res) => {
    const backup = getBackupCandidate(req.params.id);
    if (!backup) {
        return res.status(404).json({ error: 'No backup assigned' });
    }
    res.json(backup);
});
app.post('/controllers', (_req, res) => {
    res
        .status(501)
        .json({ error: 'Controller onboarding is managed via the controllers_master.xlsx source of record.' });
});
app.get('/dashboard/live', (_req, res) => {
    const frame = getCurrentFrame();
    res.json({
        timestamp: new Date().toISOString(),
        controllers: frame,
    });
});
app.get('/sectors', (_req, res) => {
    res.json(listSectorsWithRosters());
});
app.get('/sectors/:id', (req, res) => {
    const sector = getSectorRosterById(req.params.id);
    if (!sector) {
        return res.status(404).json({ error: 'Sector not found' });
    }
    res.json(sector);
});
app.get('/analytics/monthly', (req, res) => {
    const controllerId = typeof req.query.controllerId === 'string' ? req.query.controllerId : undefined;
    const report = getShiftSummaryReport(controllerId);
    res.json(report);
});
app.get('/actions', (_req, res) => {
    res.json(listSupervisorActions());
});
app.post('/actions', (req, res) => {
    const payload = req.body;
    if (!payload.controllerId || !payload.action || !payload.message) {
        return res.status(400).json({ error: 'controllerId, action, and message are required' });
    }
    const action = {
        id: nanoid(),
        controllerId: payload.controllerId,
        action: payload.action,
        message: payload.message,
        createdAt: new Date().toISOString(),
    };
    insertSupervisorAction(action);
    res.status(201).json(action);
});
app.post('/simulation/reset', (_req, res) => {
    resetSimulation();
    res.status(204).end();
});
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});
httpServer.listen(port, () => {
    console.log(`PEARL backend listening on http://localhost:${port}`);
});
//# sourceMappingURL=index.js.map