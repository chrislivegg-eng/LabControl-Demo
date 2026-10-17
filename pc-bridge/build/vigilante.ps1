# Tarea "LabControl Agent - Vigilante": si un alumno cierra el agente (por
# ejemplo desde el Administrador de tareas), Windows lo vuelve a abrir en
# menos de un minuto. La crea el instalador (como administrador), corre en la
# sesion de cualquier usuario de la PC y un alumno con cuenta estandar no la
# puede borrar. Si el agente ya esta abierto, la copia nueva se cierra sola
# (una sola instancia por PC).
param(
  [Parameter(Mandatory = $true)][string]$Exe,
  [switch]$Remove
)

$ErrorActionPreference = 'Stop'
$TaskName = 'LabControl Agent - Vigilante'

if ($Remove) {
  Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
  exit 0
}

$action = New-ScheduledTaskAction -Execute $Exe
# Al iniciar sesion y despues cada minuto, sin fecha de fin.
$atLogon = New-ScheduledTaskTrigger -AtLogOn
$everyMinute = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1)
# Grupo "Usuarios" (S-1-5-32-545): se ejecuta en la sesion de quien este conectado, sin permisos de administrador.
$principal = New-ScheduledTaskPrincipal -GroupId 'S-1-5-32-545' -RunLevel Limited
# Sin limite de tiempo: el agente debe seguir abierto toda la sesion.
$settings = New-ScheduledTaskSettingsSet -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew `
  -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -Hidden

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger @($atLogon, $everyMinute) `
  -Principal $principal -Settings $settings -Force | Out-Null
