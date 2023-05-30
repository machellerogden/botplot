<script>
    export let href = '';
    export let title = 'link';
</script>

<a class="text-secondary hover:underline" {href} {title}><slot></slot></a>
