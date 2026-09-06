$secure = Read-Host "Введите новый пароль kairozun (минимум 8 символов)" -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
  $env:MODERATOR_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
  node scripts\set-moderator-password.cjs
} finally {
  if ($ptr -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
  Remove-Item Env:MODERATOR_PASSWORD -ErrorAction SilentlyContinue
}