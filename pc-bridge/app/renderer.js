const form = document.querySelector('#login-form');
const username = document.querySelector('#username');
const password = document.querySelector('#password');
const button = document.querySelector('#login-button');
const message = document.querySelector('#message');
const statusText = document.querySelector('#status');
const pcName = document.querySelector('#pc-name');
const agentApi = window.labControlAgent;

// Electron antepone "Error invoking remote method '...': Error:" a los errores.
function cleanError(error, fallback) {
  return String(error?.message || fallback).replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/, '') || fallback;
}

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

const setupForm = document.querySelector('#setup-form');
const setupTitle = document.querySelector('#setup-title');
const setupMessage = document.querySelector('#setup-message');
const setupButton = document.querySelector('#setup-button');
const newPassword = document.querySelector('#new-password');
const confirmPassword = document.querySelector('#confirm-password');

function setSetupMessage(text, isError = false) {
  setupMessage.textContent = text;
  setupMessage.classList.toggle('error', isError);
}

function showLoginForm(text, isError = false) {
  setupForm.hidden = true;
  form.hidden = false;
  password.value = '';
  setMessage(text, isError);
  password.focus();
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!agentApi) return;

  button.disabled = true;
  setMessage('Validando...');

  try {
    const result = await agentApi.login({
      username: username.value,
      password: password.value
    });
    password.value = '';
    if (result.mustSetPassword) {
      // Entro con codigo de activacion: ahora crea su propia contrasena.
      form.hidden = true;
      setupForm.hidden = false;
      setupTitle.textContent = `Hola, ${result.displayName}. Crea tu contraseña`;
      setSetupMessage('');
      newPassword.focus();
      return;
    }
    setMessage(`Bienvenido, ${result.displayName}.`, false);
  } catch (error) {
    setMessage(cleanError(error, 'No fue posible iniciar sesión.'), true);
    password.select();
  } finally {
    button.disabled = false;
  }
});

setupForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!agentApi) return;
  if (newPassword.value !== confirmPassword.value) {
    setSetupMessage('Las contraseñas no coinciden.', true);
    confirmPassword.select();
    return;
  }

  setupButton.disabled = true;
  setSetupMessage('Guardando...');
  try {
    const session = await agentApi.setPassword({
      newPassword: newPassword.value,
      confirmPassword: confirmPassword.value
    });
    newPassword.value = '';
    confirmPassword.value = '';
    setupForm.hidden = true;
    form.hidden = false;
    setMessage(`Listo, ${session.displayName}. Tu contraseña quedó guardada.`, false);
  } catch (error) {
    const text = cleanError(error, 'No se pudo guardar la contraseña.');
    if (/código|codigo/i.test(text)) {
      showLoginForm(text, true);
    } else {
      setSetupMessage(text, true);
      newPassword.select();
    }
  } finally {
    setupButton.disabled = false;
  }
});
