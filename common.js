/**
 * Created by zhulei on 2017/10/31.
 */
var Class = (function() {
    var _mix = function(r, s) {
        for (var p in s) {
            if (s.hasOwnProperty(p)) {
                r[p] = s[p];
            }
        }
    }

    var _extend = function() {
        //开关 用来使生成原型时,不调用真正的构成流程init
        this.initPrototype = true;
        var prototype = new this();
        this.initPrototype = false;

        var items = Array.prototype.slice.call(arguments) || [];
        var item;

        //支持混入多个属性，并且支持{}也支持 Function
        while (item = items.shift()) {
            _mix(prototype, item.prototype || item);
        }

        // 这边是返回的类，其实就是我们返回的子类
        function SubClass() {
            if (!SubClass.initPrototype && this.init){
                this.init.apply(this, arguments);   //调用init真正的构造函数
            }
        }

        // 赋值原型链，完成继承
        SubClass.prototype = prototype;

        // 改变constructor引用
        SubClass.prototype.constructor = SubClass;

        // 为子类也添加extend方法
        SubClass.extend = _extend;
        return SubClass;
    }

    //超级父类
    var Class = function() {}

    //为超级父类添加extend方法
    Class.extend = _extend;
    return Class;
})();
var Base = Class.extend({
    init: function (config) {
        //自动保存配置项
        this.__config = config;
        this.render();
        this.bind();
    },
    //可以使用get来获取配置项
    get: function (key) {
        return this.__config[key];
    },
    //可以使用set来设置配置项
    set: function (key, value) {
        this.__config[key] = value;
    },
    bind: function () {},
    render: function () {},
    //定义销毁的方法，一些收尾工作都应该在这里
    destroy: function () {}
});

var CommonList = Base.extend({
    _$container: null,
    _$template: null,
    _getObject: function () {
        if(!this._$container){
            var containerId = this.get("containerId");
            this._$container = $(containerId);
        }

        if(!this._$template){
            var templateId = this.get("templateId");
            this._$template = $(templateId);
        }
    },
    _getDataList: function () {
        return this.get("dataList");
    },
    _getCallback: function () {
        return this.get("callback");
    },
    _renderView: function (data) {
        var tplStr = this._$template.html();
        var tplFun = Handlebars.compile(tplStr);
        return tplFun(data);
    },
    render: function () {
        this._getObject();

        var dataList = this._getDataList();
        var htmlStr = this._renderView(dataList);
        this._$container.html(htmlStr);
    },
    bind: function () {
        this._getCallback()();
    }
});
var WaterfallPagedList = Base.extend({
    _$container: null,
    _$template: null,
    _loadMoreBtnId: null,
    _currentPage: 1,
    _getObject: function () {
        if(!this._$container){
            var containerId = this.get("containerId");
            this._$container = $(containerId);
        }

        if(!this._$template){
            var templateId = this.get("templateId");
            this._$template = $(templateId);
        }

        if(!this._loadMoreBtnId){
            this._loadMoreBtnId = this.get("loadMoreBtn");
        }
    },
    _getAjaxUrl: function () {
        var _urlTemplate = this.get("urlTemplate");
        var _pageSize = this.get("pageSize");
        var ajaxUrl = _urlTemplate.format(this._currentPage, _pageSize);
        return ajaxUrl;
    },
    _getDataList: function (callback) {
        $.ajax({
            type: 'GET',
            url: this._getAjaxUrl(),
            async: false,
            success: function (data) {
                var result = JSON.parse(data["JsonStr"]);
                callback(result);
            },
            error: function (XMLResponse) {
                alert(XMLResponse.responseText)
            }
        });
    },
    _bindLoadMoreEvent: function () {
        var that = this;
        $(this._loadMoreBtnId).bind("click",function () {
            $(this).text("加载中...");
            that._currentPage += 1;

            var loadMoreBtnThat = this;
            that._getDataList(function (data) {
                var htmlStr = that._renderView(data);
                $(loadMoreBtnThat).parent().replaceWith(htmlStr);

                that.bind();
            });
        });
    },
    _renderView: function (data) {
        var tplStr = this._$template.html();
        var tplFun = Handlebars.compile(tplStr);
        return tplFun(data);
    },
    render: function () {
        this._getObject();

        var that = this;
        var htmlStr;
        this._getDataList(function (dataList) {
            htmlStr = that._renderView(dataList);
        });
        this._$container.html(htmlStr);
    },
    bind: function () {
        this._bindLoadMoreEvent();
    }
});
var SimplePageList = Base.extend({
    _$container: null,
    _$template: null,
    _prevBtn: null,
    _nextBtn: null,
    _currentPage: 1,
    _totalPage: null,
    _getObject: function () {
        if(!this._$container){
            var containerId = this.get("containerId");
            this._$container = $(containerId);
        }

        if(!this._$template){
            var templateId = this.get("templateId");
            this._$template = $(templateId);
        }

        if(!this._prevBtn){
            this._prevBtn = this.get("prevBtn");
        }
        if(!this._nextBtn){
            this._nextBtn = this.get("nextBtn");
        }
    },
    _getAjaxUrl: function () {
        var _urlTemplate = this.get("urlTemplate");
        var _pageSize = this.get("pageSize");
        var ajaxUrl = _urlTemplate.format(this._currentPage, _pageSize);
        return ajaxUrl;
    },
    _getDataList: function (callback) {
        var that = this;
        $.ajax({
            type: 'GET',
            url: this._getAjaxUrl(),
            async: false,
            success: function (data) {
                var result = JSON.parse(data["JsonStr"]);
                that._totalPage = result.total_pages;
                callback(result);
            },
            error: function (XMLResponse) {
                alert(XMLResponse.responseText)
            }
        });
    },

    _checkPrevBtnState: function () {
        if(this._currentPage == 1){
            $(this._prevBtn).attr("disabled", "disabled");
        }else{
            $(this._prevBtn).removeAttr("disabled");
        }
    },
    _checkNextBtnState: function () {
        if(this._currentPage == this._totalPage){
            $(this._nextBtn).attr("disabled", "disabled");
        }
        else{
            $(this._nextBtn).removeAttr("disabled");
        }
    },
    _checkBtnState: function () {
        this._checkPrevBtnState();
        this._checkNextBtnState();
    },
    _bindLoadMoreEvent: function () {
        var that = this;
        //注：类名为SPL_content_wrap内的内容，在分页时候进行替换。
        // _contentWrap = _containerId + " .SPL_content_wrap";
        $(this._prevBtn).bind("click",function () {
            that._checkBtnState();
            if(that._currentPage == 1){
                return;
            }
            that._currentPage -= 1;
            that._getDataList(function (data) {
                var htmlStr = that._renderView(data);
                $(that.get("containerId") + " .SPL_content_wrap").replaceWith(htmlStr);
                $(that.get("containerId") + " .SPL_content_wrap").next().remove();
            });
            that._checkBtnState();
        });

        $(this._nextBtn).bind("click",function () {
            that._checkBtnState();
            if(that._currentPage == that._totalPage){
                return;
            }
            that._currentPage += 1;
            that._getDataList(function (data) {
                var htmlStr = that._renderView(data);
                $(that.get("containerId") + " .SPL_content_wrap").replaceWith(htmlStr);
                $(that.get("containerId") + " .SPL_content_wrap").next().remove();
            });
            that._checkBtnState();
            console.log("currentPage:"+that._currentPage+" totalPage:"+that._totalPage);

        });
    },
    _renderView: function (data) {
        var tplStr = this._$template.html();
        var tplFun = Handlebars.compile(tplStr);
        return tplFun(data);
    },
    render: function () {
        this._getObject();

        var that = this;
        var htmlStr;
        this._getDataList(function (dataList) {
            htmlStr = that._renderView(dataList);
        });
        this._$container.html(htmlStr);
        this._checkBtnState();
    },
    bind: function () {
        this._bindLoadMoreEvent();
    }
});