const loginForm = document.getElementById('login-div');
const registerForm = document.getElementById('register-div');
const passwordRegister = document.getElementById('register-password');
const passwordConfirm = document.getElementById('confirm-password');
const usernameRegister = document.getElementById('register-username');

function switchToRegister() {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
}

function switchToLogin() {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
}

function checkPasswords() {
    if (passwordRegister.value === passwordConfirm.value) {
        passwordRegister.style.borderColor = 'green';
        passwordConfirm.style.borderColor = 'green';
        passwordConfirm.setCustomValidity('');
    }
    else {
        passwordRegister.style.borderColor = 'red';
        passwordConfirm.style.borderColor = 'red';
        passwordConfirm.setCustomValidity('Passwords must match');
    }
}

async function okUsername() {
    const str = usernameRegister.value;
    if (str.length > 0) {
        const response = await fetch(`/finduser/${str}`);
        if (response.ok) {
            const bool = await response.json();
            if (bool) {
                usernameRegister.setCustomValidity('Username already registered');
                usernameRegister.reportValidity();
                usernameRegister.style.borderColor = 'red';
            }
            else {
                usernameRegister.style.borderColor = '';
                usernameRegister.setCustomValidity('');
            }
        }
    }
}

async function checkFailure() {
    const fail = await fetch('fail').catch(function (error) {
        alert(error);
    });
    if (fail.ok) {
        const str = (await fail.json())[0];
        if (str) {
            document.getElementById('alert').innerHTML =
                `<div class="bg-red-100 w-[12rem] p-2 text-center rounded-md">
        ${str}
        <span class="closebtn" onclick="this.parentElement.style.display='none';">&times;</span>
        </div>`;
        }
    }
}

document.getElementById('register-button').addEventListener('click', () => switchToRegister());
document.getElementById('login-button').addEventListener('click', () => switchToLogin());
passwordConfirm.addEventListener('keyup', () => checkPasswords());
usernameRegister.addEventListener('keyup', () => okUsername());
checkFailure();