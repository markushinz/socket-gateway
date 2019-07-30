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
        }
    }
});
