function validateForm(event) {
    'use strict';

    const form = document.getElementById('form_reg');
    const passwordInput = document.getElementById('input_password');
    const confirmPasswordInput = document.getElementById('input_password_repeat');

    if (form && !form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
    }

    // Проверяем совпадение паролей
    if (passwordInput.value !== confirmPasswordInput.value) {
        event.preventDefault();
        event.stopPropagation();
        // Обрабатываем ошибку - например, добавляем класс с стилями, указывающими на ошибку
        document.getElementById("password_repeat_error").style.display = "block";
    } else {
        // Если пароли совпадают, удаляем класс с ошибкой (если ранее был добавлен)
        document.getElementById("password_repeat_error").style.display = "none";
    }

    form.classList.add('was-validated');
}