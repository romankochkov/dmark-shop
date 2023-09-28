document.addEventListener("DOMContentLoaded", function (event) {
    totalValue();
    formatNumber();
});

function formatNumber() {
    const elements = document.querySelectorAll('.phone-number');

    elements.forEach(elem => {
        var num = elem.value.replace(/\D/g, '').split(/(?=.)/), i = num.length - 1;
        if (1 > i) num.unshift('38');
        if (0 <= i) num.unshift('+');
        if (1 <= i) num.splice(3, 0, ' (');
        if (4 <= i) num.splice(7, 0, ') ');
        if (7 <= i) num.splice(11, 0, '-');
        if (9 <= i) num.splice(14, 0, '-');
        elem.value = num.join('');
    });
}

// Функция для форматирования числа с разделителями
function formatNumberWithSeparators(num) {
    var numStr = num.toString();
    var formattedNum = [];
    for (var i = 0; i < numStr.length; i++) {
        if (i === 1) formattedNum.push(' (');
        if (i === 4) formattedNum.push(') ');
        if (i === 7) formattedNum.push('-');
        if (i === 9) formattedNum.push('-');
        formattedNum.push(numStr[i]);
    }
    return formattedNum.join('');
}

function increaseValue(id) {
    if ($('#button_save').css('visibility') == 'hidden') $('#button_save').css('visibility', 'visible'); 

    var element_count = document.getElementById('cart_count_' + id);
    var element_price = document.getElementById('cart_price_' + id);
    var element_price_hidden = document.getElementById('cart_price_' + id + '_hidden');
    var element_amount_hidden = document.getElementById('cart_amount_' + id + '_hidden');

    var count = parseInt(element_count.innerText);
    var price = parseFloat((element_price_hidden.innerText).replace(',', '.'));
    count++;

    // Обновление содержимого элемента с новым значением
    element_count.innerText = count;
    element_amount_hidden.value = count;
    element_price.innerText = (((price * count).toFixed(2)).toString()).replace('.', ',') + ' €';
    element_price.setAttribute("count", count);

    totalValue();
}

function decreaseValue(id) {
    if ($('#button_save').css('visibility') == 'hidden') $('#button_save').css('visibility', 'visible');

    var element_count = document.getElementById('cart_count_' + id);
    var element_price = document.getElementById('cart_price_' + id);
    var element_price_hidden = document.getElementById('cart_price_' + id + '_hidden');
    var element_amount_hidden = document.getElementById('cart_amount_' + id + '_hidden');

    var count = parseInt(element_count.innerText);
    var price = parseFloat((element_price_hidden.innerText).replace(',', '.'));

    if (count == 1) return;

    var count = parseInt(element_count.innerText);
    var price = parseFloat((element_price_hidden.innerText).replace(',', '.'));
    count--;

    // Обновление содержимого элемента с новым значением
    element_count.innerText = count;
    element_price.innerText = (((price * count).toFixed(2)).toString()).replace('.', ',') + ' €';
    element_amount_hidden.value = count;

    totalValue();
}



