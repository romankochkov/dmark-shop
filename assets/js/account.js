$(document).ready(function () {
    if ((window.location.search).includes('?status=success')) {
        const toast = new bootstrap.Toast($('#success_toast'), { delay: 2000 });
        toast.show();
    }
});

function validateForm(event) {
    'use strict';

    const form = document.getElementById('form_add_product');

    if (form && !form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
    }

    form.classList.add('was-validated');
}