const app = new Vue({
    el: '#app',
    data: {
        scheme: 'https',
        host: '',
        port: 443,
        path: '/',
        method: 'GET',
        headers: '',
        query: '',
        body: ''
    },
    computed: {
        url: function () {
            return this.scheme + '://' + this.host + ':' + this.port + this.path
        },
        headersIsValid: function () {
            return this.isJSONValid(this.headers)
        },
        queryIsValid: function () {
            return this.isJSONValid(this.query)
        },
        bodyIsValid: function () {
            return this.isJSONValid(this.body)
        }
    },
    methods: {
        isJSONValid: function (data) {
            try {
                if (data === '') {
                    return true;
                }
                JSON.parse(data);
                return true;
            } catch (error) {
                return false;
            }
        }
    }
});
