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

function totalValue() {
    const orders = document.getElementsByClassName('card-total');

    for (let a = 0; a < orders.length; a++) {
        var id = (orders[a]).getAttribute('pointer');
        console.log(id);

        var elements = document.getElementsByClassName("price-element-" + id);

        var sum = 0;

        var cardTotal = document.getElementById("card_total_" + id);
        cardTotal.innerHTML = ""; // Очищаем содержимое card-total

        for (var i = 0; i < elements.length; i++) {

            var label = elements[i].getAttribute('label');
            var count = elements[i].getAttribute('count');

            var text = elements[i].innerText.replace(',', '.').slice(0, -2);
            var numbers = text.match(/[\d.]+/g);

            if (numbers !== null) {
                for (var j = 0; j < numbers.length; j++) {
                    sum += parseFloat(numbers[j]) * count;
                }
            }
            var element_price = (parseFloat(text) * count).toFixed(2);

            var row = document.createElement("div");
            row.classList.add("row");
            row.classList.add("px-1");
            if (i !== (elements.length - 1)) {
                row.classList.add("card-total-item");
            } else {
                row.classList.add("card-total-item-last");
            }

            var col1 = document.createElement("div");
            col1.classList.add("col-9");

            var col2 = document.createElement("div");
            col2.classList.add("col-3");

            var labelP = document.createElement("p");
            labelP.classList.add("text-start");
            labelP.innerHTML = label + ' <span style="white-space: nowrap;">(' + count + ' шт.)</span>';

            var priceP = document.createElement("p");
            priceP.classList.add("text-end");
            priceP.innerHTML = element_price.toString().replace('.', ',') + ' €<br><span style="color: rgba(82, 82, 96, 0.7);">' + Math.ceil(element_price * 42) + ' ₴</span>';

            col1.appendChild(labelP);
            col2.appendChild(priceP);

            row.appendChild(col1);
            row.appendChild(col2);

            cardTotal.appendChild(row);

            console.log("Label:", label, "Цена:", text);
        }

        $('#price_total_' + id).html('<span style="color: rgba(82, 82, 96, 0.7); font-weight: 500;">' + Math.ceil(sum * 42) + ' ₴ │</span> ' + sum.toFixed(2).replace('.', ',') + ' €');
    }
}

function changeIcon(id) {
    if ($('#open_icon_' + id).attr("type") === 'down') {
        $('#open_' + id).html('&nbsp;&nbsp;Приховати&nbsp;&nbsp;<i id="open_icon_' + id + '" class="fa-solid fa-caret-up" style="font-size: 14px;" type="up"></i>&nbsp;');
    } else {
        $('#open_' + id).html('&nbsp;&nbsp;Відкрити&nbsp;&nbsp;<i id="open_icon_' + id + '" class="fa-solid fa-caret-down" style="font-size: 14px;" type="down"></i>&nbsp;');
    }
}



