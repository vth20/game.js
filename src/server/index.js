import http from 'http';
import express from 'express';
import { Server as socketIO } from 'socket.io';

const app = express();
const server = http.Server(app);
const io = new socketIO(server, {
	cors: {
		origin: '*',
		methods: ['GET', 'POST'],
		credentials: true,
		secure: true,
		transports: ['websocket', 'polling'],
	},
	allowEIO4: true,
});

let clients = [];
app.get('/', (req, res) => {
	res.send('Hello');
});

const addClient = socket => {
	console.log("New client connected", socket.id);
	if(!clients.length) {
		clients.push({ id: socket.id, role: 'player' });
	} else {
		const role = clients[0].role === 'player' ? 'enemy' : 'player'
		clients.push({ id: socket.id, role });
	}
};
const removeClient = id => {
	console.log("Client disconnected", id);
	clients = clients.filter(oSocket => {
		return oSocket.id !== id
	})
}

const getRole = (socketId) => {
	const oSocket = clients.filter(oSocket => oSocket.id === socketId)
	return oSocket[0].role
}

const infoCharacter = {
	first: {
		position: {x: 200, y: 0},
		offset: {x:215, y:155},
		role: 'player'
	},
	second: {
		position: { x: 750, y: 100 },
		offset: { x: 215, y: 169 },
		role: 'enemy'
	},
}
let timerID
let time = 60
const decreaseTimer = () => {
	clearTimeout(timerID)
	if (time > 0) {
		timerID = setInterval(() => { decreaseTimer() }, 1000)
		time -= 1
		io.emit('decreaseTime', time)
	}
}
io.sockets.on("connection", socket => {
	const id = socket.id;
	addClient(socket);
	const role = getRole(id)
	socket.emit('getRole', role)
	if(clients.length === 2) {
		io.emit('start')
		decreaseTimer()
	}
	socket.emit('drawFirstPlayer', infoCharacter.first)
	if (clients.length === 2) {
			socket.emit('drawFirstPlayer', infoCharacter.first)
			io.emit('drawSecondPlayer', infoCharacter.second)
	}
	socket.on("keydown", (data) => {
		socket.broadcast.emit("moving", data);
	});

	socket.on("keyup", (data) => {
		socket.broadcast.emit("moving", data);
	});

	socket.on("disconnect", () => {
		removeClient(id);
		socket.broadcast.emit("clientDisconnect", { id, role });
		console.log(clients);
	});

});

const port = process.env.PORT || 8080;
server.listen(port, () => console.log("App listening at localhost:" + port));