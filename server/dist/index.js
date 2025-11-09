import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { nanoid } from 'nanoid';
import { controllers, supervisor, simulationFrames, shiftSummaries, supervisorActions as seedActions, } from './data/mockData.js';
import { advanceFrame, getCurrentFrame, resetSimulation } from './services/simulation.js';
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
let actions = [...seedActions];
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
    res.json({
        status: 'ok',
        controllers: controllers.length,
        frames: simulationFrames.length,
        timestamp: new Date().toISOString(),
    });
});
app.post('/auth/controller', (req, res) => {
    const { controllerId } = req.body;
    if (!controllerId) {
        return res.status(400).json({ error: 'controllerId is required' });
    }
    const profile = controllers.find((controller) => controller.id === controllerId);
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
    if (supervisorId !== supervisor.id || password !== supervisor.password) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    return res.json({ id: supervisor.id, name: supervisor.name });
});
app.get('/controllers', (_req, res) => {
    res.json(controllers);
});
app.get('/controllers/:id', (req, res) => {
    const controller = controllers.find((entry) => entry.id === req.params.id);
    if (!controller) {
        return res.status(404).json({ error: 'Controller not found' });
    }
    res.json(controller);
});
app.post('/controllers', (req, res) => {
    const payload = req.body;
    if (!payload.id || !payload.name) {
        return res.status(400).json({ error: 'id and name are required' });
    }
    const existing = controllers.find((controller) => controller.id === payload.id);
    if (existing) {
        return res.status(409).json({ error: 'Controller already exists' });
    }
    const newController = {
        id: payload.id,
        name: payload.name,
        experienceYears: payload.experienceYears ?? 0,
        yearOfBirth: payload.yearOfBirth ?? 1995,
        gender: payload.gender ?? 'Other',
        active: true,
        baselineReadiness: 0.9,
        baselineFactors: {
            blinkRate: 17,
            speechRate: 123,
            responseDelay: 0.95,
            toneStability: 0.92,
        },
    };
    if (typeof payload.healthNotes === 'string' && payload.healthNotes.trim().length > 0) {
        newController.healthNotes = payload.healthNotes;
    }
    controllers.push(newController);
    res.status(201).json(newController);
});
app.get('/dashboard/live', (_req, res) => {
    const frame = getCurrentFrame();
    res.json({
        timestamp: new Date().toISOString(),
        controllers: frame,
    });
});
app.get('/analytics/monthly', (_req, res) => {
    res.json({
        summaries: shiftSummaries,
        insights: [
            {
                label: 'Night shifts show 34% higher fatigue on average. Recommend rotating controllers every 90 minutes.',
            },
            {
                label: 'Hydration reminders reduce pause ratio spikes by 12% across afternoon shifts.',
            },
        ],
    });
});
app.get('/actions', (_req, res) => {
    res.json(actions);
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
    actions = [action, ...actions];
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