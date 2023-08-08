function validateForm(event) {
    'use strict';

    const form = document.getElementById('form_auth');

    if (form && !form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
    }

    form.classList.add('was-validated');
}