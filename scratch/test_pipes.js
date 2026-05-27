import net from 'net';

async function checkPipe(id) {
  return new Promise((resolve) => {
    const pipePath = `\\\\.\\pipe\\discord-ipc-${id}`;
    const socket = net.createConnection(pipePath);
    socket.on('connect', () => {
      console.log(`Connected successfully to pipe ${id}: ${pipePath}`);
      socket.destroy();
      resolve(true);
    });
    socket.on('error', (err) => {
      console.log(`Failed to connect to pipe ${id} (${pipePath}): ${err.message}`);
      resolve(false);
    });
  });
}

async function run() {
  for (let i = 0; i < 10; i++) {
    await checkPipe(i);
  }
}

run();
