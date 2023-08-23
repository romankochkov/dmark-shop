$(document).ready(function () {
    $('.save-product').click(function (event) {
        event.preventDefault();

        var itemId = $(this).data('item-id');
        var price = $('#input_price_' + itemId).val();
        var price_factor = $('#input_price_factor_' + itemId).val();
        var exists = $('#select_exists_' + itemId).children("option:selected").val();
        var amount = $('#input_amount_' + itemId).val();
        var box = $('#input_box_' + itemId).val();

        if (exists == '1') {
            $.ajax({
                url: '/account/editor/save?id=' + itemId + '&price=' + price + '&price_factor=' + price_factor + '&exists=' + exists + '&amount=' + amount + '&box=' + box,
                method: 'GET',
                success: function (response) {
                    const toast = new bootstrap.Toast($('#success_toast'), { delay: 2000 });
                    toast.show();
                },
                error: function (error) {
                    console.error(error);
                }
            });
        } else {
            $.ajax({
                url: '/account/editor/save?id=' + itemId + '&exists=' + exists,
                method: 'GET',
                success: function (response) {
                    const toast = new bootstrap.Toast($('#success_toast'), { delay: 2000 });
                    toast.show();
                },
                error: function (error) {
                    console.error(error);
                }
            });
        }
    });

    $('.exists-product').change(function () {
        console.log($(this).val());
        if ($(this).val() == '1') {
            $('#input_amount_' + $(this).data('item-id')).parents(".form-floating").removeClass('d-none');
            $('#input_box_' + $(this).data('item-id')).parents(".form-floating").removeClass('d-none');
        } else {
            $('#input_amount_' + $(this).data('item-id')).parents(".form-floating").addClass('d-none');
            $('#input_box_' + $(this).data('item-id')).parents(".form-floating").addClass('d-none');
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