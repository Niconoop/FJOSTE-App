import DiscordRPC from 'discord-rpc';

const clientId = '1447245757232058510';
const rpc = new DiscordRPC.Client({ transport: 'ipc' });

console.log('Trying to connect to Discord RPC with clientId:', clientId);

rpc.on('ready', () => {
  console.log('Successfully connected!');
  rpc.setActivity({
    details: 'Testing RPC Connection',
    state: 'It works!',
    largeImageKey: 'fjoste',
    largeImageText: 'FJOSTE Tracker',
  }).then(() => {
    console.log('Activity set successfully!');
    setTimeout(() => {
      rpc.destroy();
      process.exit(0);
    }, 5000);
  }).catch((err) => {
    console.error('Failed to set activity:', err);
    rpc.destroy();
    process.exit(1);
  });
});

rpc.on('error', (err) => {
  console.error('RPC Error event:', err);
});

rpc.login({ clientId }).catch((err) => {
  console.error('RPC login promise rejected:', err);
  process.exit(1);
});
