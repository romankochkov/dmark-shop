$(document).ready(function () {
    if ((window.location.search).includes('?registration=success')) {
        const toast = new bootstrap.Toast($('#reg_toast'), { delay: 2000 });
        toast.show();
    } else if ((window.location.search).includes('?authentication=success')) {
        const toast = new bootstrap.Toast($('#auth_toast'), { delay: 2000 });
        toast.show();
    } else if ((window.location.search).includes('?order=success')) {
        const toast = new bootstrap.Toast($('#order_toast'), { delay: 3000 });
        toast.show();
    }

    $('.add-to-favorites').click(function (event) {
        event.preventDefault();

        var itemId = $(this).data('item-id');

        $.ajax({
            url: '/account/favorites/add?id=' + itemId,
            method: 'GET',
            success: function (response) {
                console.log(response.message);

                $('#favorites_icon_' + itemId).removeClass('fa-regular').addClass('fa-solid');

                const toast = new bootstrap.Toast($('#favorites_toast'), { delay: 2000 });
                toast.show();
            },
            error: function (error) {
                if (error.status === 400) {
                    const toast = new bootstrap.Toast($('#favorites_error_toast'), { delay: 2000 });
                    toast.show();
                }
            }
        });
    });

    $('.del-from-favorites').click(function (event) {
        event.preventDefault();

        var itemId = $(this).data('item-id');
        window.open('/account/favorites/del?id=' + itemId, '_self');
    });

    $('.add-to-cart').click(function (event) {
        event.preventDefault();

        var itemId = $(this).data('item-id');

        $.ajax({
            url: '/cart/add?id=' + itemId,
            method: 'GET',
            success: function (response) {
                if (response.message != 'DUPLICATE') {
                    if (($('#cart_length').text().trim()) === '') {
                        $('#cart_length').text('1');
                        $('#cart_length_mobile').text('1');
                    } else {
                        $('#cart_length').text(parseInt($('#cart_length').text()) + 1);
                        $('#cart_length_mobile').text(parseInt($('#cart_length_mobile').text()) + 1);
                    }
                }
                const toast = new bootstrap.Toast($('#cart_toast'), { delay: 2000 });
                toast.show();
            },
            error: function (error) {
                console.error(error);
            }
        });
    });

    $('#link_denkmit').mouseenter(function () {
        $('#nav_overlay').css('display', 'block');
        $('#dropdown_denkmit').css('display', 'block');
    });

    $('#link_denkmit').mouseleave(function () {
        $('#nav_overlay').css('display', 'none');
        $('#dropdown_denkmit').css('display', 'none');
    });
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

function addReview(grade) {
    $.ajax({
        url: '/account/review/add?grade=' + grade,
        method: 'GET',
        success: function (response) {
            console.log(response.message);

            const toast = new bootstrap.Toast($('#review_toast'), { delay: 2000 });
            toast.show();
        },
        error: function (error) {
            console.error(error);
        }
    });
}