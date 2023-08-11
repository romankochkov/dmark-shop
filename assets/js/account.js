$(document).ready(function () {
    if ((window.location.search).includes('?status=success')) {
        const toast = new bootstrap.Toast($('#success_toast'), { delay: 2000 });
        toast.show();
    }
});

$('#link_denkmit').mouseenter(function () {
    $('#nav_overlay').css('display', 'block');
    $('#dropdown_denkmit').css('display', 'block');
});

$('#link_denkmit').mouseleave(function () {
    $('#nav_overlay').css('display', 'none');
    $('#dropdown_denkmit').css('display', 'none');
});

$('#link_balea').mouseenter(function () {
    $('#nav_overlay').css('display', 'block');
    $('#dropdown_balea').css('display', 'block');
});

$('#link_balea').mouseleave(function () {
    $('#nav_overlay').css('display', 'none');
    $('#dropdown_balea').css('display', 'none');
});

function changeIconSidebar(element) {
    if ($(element).hasClass('fa-chevron-down')) {
        $(element).removeClass('fa-chevron-down');
        $(element).addClass('fa-chevron-up');
    } else {
        $(element).removeClass('fa-chevron-up');
        $(element).addClass('fa-chevron-down');
    }
}

function validateForm(event) {
    'use strict';

    const form = document.getElementById('form_add_product');

    if (form && !form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
    }

    form.classList.add('was-validated');
}