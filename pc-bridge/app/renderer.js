const form = document.querySelector('#login-form');
const username = document.querySelector('#username');
const password = document.querySelector('#password');
const button = document.querySelector('#login-button');
const message = document.querySelector('#message');
const statusText = document.querySelector('#status');
const pcName = document.querySelector('#pc-name');
const agentApi = window.labControlAgent;

function setMessage(text, isError = false) {
  message.textContent = text;
  message.classList.toggle('error', isError);
}

if (!agentApi) {
  setMessage('No se pudo cargar el puente local de LabControl.', true);
  statusText.textContent = 'Reabre la app o usa el acceso de respaldo.';
  button.disabled = true;
} else {
  agentApi.getContext().then(context => {
    pcName.textContent = context.pc;
    statusText.textContent = `Servidor: ${context.serverUrl}`;
    username.focus();
  }).catch(error => {
    pcName.textContent = 'No detectado';
    setMessage(error.message || 'No se pudo leer el equipo.', true);
  });

  agentApi.onStatus(status => {
    statusText.textContent = status;
  });

  agentApi.onLoginRequired(text => {
    setMessage(text, true);
    username.focus();
  });

  agentApi.onLoginSuccess(session => {
    setMessage(`Sesión iniciada como ${session.displayName}. La app seguirá reportando en segundo plano.`, false);
    statusText.textContent = 'Conectado con LabControl.';
  });
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!agentApi) return;

  button.disabled = true;
  setMessage('Validando credenciales...');

  try {
    const session = await agentApi.login({
      username: username.value,
      password: password.value
    });
    setMessage(`Bienvenido, ${session.displayName}.`, false);
    password.value = '';
  } catch (error) {
    setMessage(error.message || 'No fue posible iniciar sesión.', true);
    password.select();
  } finally {
    button.disabled = false;
  }
});
