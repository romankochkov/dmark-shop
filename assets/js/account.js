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

$('#brand').on('change', function () {
    if (this.value == 'Denkmit') {
        $('#type').html('<select class="form-select" name="type" required><option selected>kitchen</option><option>washing</option><option>wc</option><option>cleaning</option><option>fresh</option><option>other</option></select><label>Категорія</label>');
    } else if (this.value == 'Balea') {
        $('#type').html('<select class="form-select" name="type" required><option selected>hair</option><option>skin</option><option>body</option><option>shave</option><option>hygiene</option></select><label>Категорія</label>');
    } else {
        $('#type').html('<input type="text" class="form-control" placeholder="" name="type" value="none" required><label>Категорія</label>');
    }
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

function addPicture() {
    console.log('sfdsf');
    $('#add_pictures').append('<div class="form-floating mb-3"><input type="text" class="form-control" placeholder="" name="pictures" required><label>Додаткове зображення</label><div class="remove-picture" onclick="$(this).parent().remove();"><i class="fa-solid fa-xmark"></i></div></div>');
    
}