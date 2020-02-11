var supportComponent = {
  BASE: {
    url: window.location.href,
    service: 'https://service.zbaichuang.com',
    matchUrl: [
      { url: '//eb.meituan.com/ebk/consume/orderprint.html', name: 'MEITUAN_EBOOKING' },
      { url: '//ebooking.ctrip.com/ebkorder/order/OrderPrint.aspx', name: 'CTRIP_EBOOKING' },
      { url: '//ebooking.fliggy.com/trade/orderUv.htm', name: 'FLIGGY_EBOOKING' },
      { url: '//kz.quhuhu.com/v2/print/orderPrint.htm', name: 'QUHUHU_EBOOKING' },
    ],
    ifmUrl: 'https://shanghu.zbaichuang.com/#/merchant/business/setting',
    ischannel: ''
  },
  param2Obj: function (url) {
    return JSON.parse(
      '{"' + decodeURIComponent(url).replace(/"/g, '\\"').replace(/&/g, '","').replace(/=/g, '":"').replace(/\+/g, ' ') + '"}'
    )
  },
  obj2str: function (obj) {
    return Object.getOwnPropertyNames(obj).map(key => {
      return encodeURIComponent(key) + '=' + encodeURIComponent(obj[key])
    }).join('&')
  },
  desc_sha256: function (obj) {
    const sign = {}
    Object.keys(obj).sort().forEach(function (key) {
      sign[key] = obj[key]
    })
    var z1 = this.obj2str(sign)
    var z2 = CryptoJS.SHA256(z1).toString();
    var z3 = obj.merchantKey + '&' + z2;
    var z4 = CryptoJS.MD5(z3).toString();
    return z4
  },
  replaceTime: function (time) {
    time = time.replace(/([\-]+)/g, '')
    time = time.replace(' ', '')
    time = time.replace(/([\:]+)/g, '')
    return time;
  },
  sleep: function(n) {
    var start = new Date().getTime();
    while(true){
      if(new Date().getTime() - start > n){
        break;
      }
    }
  },
  exportTime: function () {
    var CFM = function (num) {
      if (num < 10) {
        return '0' + num
      } else {
        return num
      }
    }
    var now = new Date()
    var year = now.getFullYear()
    var month = now.getMonth() + 1
    var date = now.getDate()
    var hours = now.getHours()
    var minutes = now.getMinutes()
    var seconds = now.getSeconds()
    return '' + year + CFM(month) + CFM(date) + CFM(hours) + CFM(minutes) + CFM(seconds)
  },
  setErCode: function (channel) {
    console.log('e1')
    var self = this
    window.frames['shanghuIframe'].postMessage('msecret', self.BASE.ifmUrl)
    window.onmessage = function(e) {
      console.log(e, 'e.data')
      var data = e.data;
      if (data && data.msecret && data.t) {
        var matchParams = self.getParams(channel)
        if (!matchParams && matchParams.orderId) {
          return false;
        }
        var totalPrice = matchParams.totalPrice; // 总价
        var orderId = matchParams.orderId; // 订单号
        var time = matchParams.time; // 时间
        var params = {
          orderId: orderId,
          merchantKey: data.msecret,
          dataChannel: channel,
          dataSources: '4',
          payChannel: '99',
          tranTime: self.replaceTime(time),
          tranCcy: 'CNY',
          tranAmount: parseFloat(totalPrice).toFixed(2)
        }
        var sign = self.desc_sha256(params)
        var datas = {
          sign: sign,
          data: params
        }
        self.submitAjax(datas, data.t, channel) // t=token
      }
    }
  },
  getParams: function (channel) {
    console.log('channel', channel)
    var self = this
    var totalPrice = ''
    var orderId = ''
    var time = ''
    switch (channel) {
      case 'MEITUAN_EBOOKING':
        totalPrice = $("#ng-main .print-box:last").find("li").eq(3).html(); // 总价
        orderId = self.param2Obj(window.location.search.replace("?", "")).orderId
        time = self.exportTime()
        return {
          totalPrice: totalPrice.replace(/[^0-9\.]/g, ''),
          orderId: orderId,
          time: time
        }
      case 'CTRIP_EBOOKING':
        totalPrice = $("#lbInvoice").html().split("。"); // 总价
        orderId = $("#lblOrderID").html()
        time = self.exportTime()
        return {
          totalPrice: totalPrice[0].replace(/[^0-9\.]/g, ''),
          orderId: orderId.replace(/[^0-9]/g, ''),
          time: time
        }
      case 'FLIGGY_EBOOKING':
        totalPrice = $(".orderInfo--zh--3qJrIcV .orderInfo--infoPart--2wQF6fQ").eq(2).find("table tr td").eq(1).html(); // 总价
        var um = window.location.hash.split('?')
        orderId = self.param2Obj(um[1]).tid
        time = self.exportTime()
        return {
          totalPrice: totalPrice.replace(/[^0-9\.]/g, ''),
          orderId: orderId,
          time: time
        }
      case 'QUHUHU_EBOOKING':
        var lengths = $(".min-bill-print").find("div").length
        console.log(lengths)
        totalPrice = $(".min-bill-print div").eq(lengths - 3).find("table tr:first td:first").html(); // 总价
        orderId = self.param2Obj(window.location.search.replace("?", "")).orderNo
        time = self.exportTime()
        return {
          totalPrice: totalPrice.replace(/[^0-9\.]/g, ''),
          orderId: orderId,
          time: time
        }
      default:
        return null
    }
  },
  submitAjax: function (data, t, channel) {
    $.ajax({
      type: "POST",
      url: this.BASE.service + "/api/external/orderPush",
      timeout: 15000,
      async: false,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": t
      },
      data: JSON.stringify(data),
      dataType: "json",
      success: function (res) {
        var error_code = ["44001", "44002", "44003", "44004"]
        if (res && res.code == 'EX0000') {
          if (channel == 'MEITUAN_EBOOKING') {
            $("#ng-main .print-box:last").append("<li style='text-align:left; padding-left: 40px;' id='J_trade_imfor_Ercode'></li>");
            $("#J_trade_imfor_Ercode").qrcode({
              width: 150, // 度
              height: 150, // 高度
              text: res.data // 任意内容
            })
          }
          if (channel == 'CTRIP_EBOOKING') {
            $("#trInvoice").after("<tr><th></th><td id='J_trade_imfor_Ercode'></td></div>");
            $("#J_trade_imfor_Ercode").qrcode({
              width: 150, // 度
              height: 150, // 高度
              text: res.data // 任意内容
            })
            window.rePrint()
          }
          if (channel == 'FLIGGY_EBOOKING') {
            $(".orderState--right--2-T6sj8").append("<div style='text-align:left;text-align:center ;padding-bottom: 10px;' id='J_trade_imfor_Ercode'></div>");
            $("#J_trade_imfor_Ercode").qrcode({
              width: 150, // 度
              height: 150, // 高度
              text: res.data // 任意内容
            })
          }
          if (channel == 'QUHUHU_EBOOKING') {
            $(".min-bill-print").append("<div style='text-align:left;text-align:left ;padding-bottom: 10px;' id='J_trade_imfor_Ercode'></div>");
            $("#J_trade_imfor_Ercode").qrcode({
              width: 150, // 度
              height: 150, // 高度
              text: res.data // 任意内容
            })
            window.rePrint()
            let top = $(window.parent.document).find("#j-contenter");
            $(top).siblings("iframe").remove()
          }
        } else if (error_code.indexOf(res.code.toString()) >= 0) {
          alert("登录已过期，请重新登录聚票通后台")
        } else {
          alert(res.msg)
        }
        $("#shanghuIframe").remove();
      },
      error: function (err) {
        if (err.msg) {
          alert(err.msg)
        }
        $("#shanghuIframe").remove();
      }
    })
  },
  init: function () {
    var self = this;
    $.each(self.BASE.matchUrl, function (index, value) {
      if (self.BASE.url.indexOf(value.url) >= 0) {
        self.BASE.ischannel = value.name
      }
    })
    if (!self.BASE.ischannel) {
      return false
    } else {
      if (self.BASE.ischannel == 'CTRIP_EBOOKING' || self.BASE.ischannel == 'QUHUHU_EBOOKING') {
        window.rePrint = window.print
        window.print = function(e){}
      }
      // 设置Iframe
      var iframe = "<iframe src='" + self.BASE.ifmUrl + "' frameborder='0' name='shanghuIframe' id='shanghuIframe' style='display:none'></iframe>"
      $("body").append(iframe)

      var ifr = document.getElementById("shanghuIframe")
      if (ifr.attachEvent) {
        ifr.attachEvent("onload", function () {
          self.setErCode(self.BASE.ischannel)
        });
      } else {
        ifr.onload = function () {
          self.setErCode(self.BASE.ischannel)
        };
      }
    }
  }
}
