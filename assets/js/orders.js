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

function changeIcon(id) {
    if ($('#open_icon_' + id).attr("type") === 'down') {
        $('#open_' + id).html('&nbsp;&nbsp;Приховати&nbsp;&nbsp;<i id="open_icon_' + id + '" class="fa-solid fa-caret-up" style="font-size: 14px;" type="up"></i>&nbsp;');
    } else {
        $('#open_' + id).html('&nbsp;&nbsp;Відкрити&nbsp;&nbsp;<i id="open_icon_' + id + '" class="fa-solid fa-caret-down" style="font-size: 14px;" type="down"></i>&nbsp;');
    }
}



