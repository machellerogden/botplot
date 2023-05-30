<script>
    import DefaultLayout from '../layout/DefaultLayout.svelte';
</script>

<DefaultLayout>

    <svelte:fragment slot="top-right">
        top-right
    </svelte:fragment>

    <div class="relative" slot="main">
        main
    </div>

    <div slot="drawer-left">
        drawer-left
    </div>

    <div class="p-6" slot="drawer-right">
        drawer-right
    </div>

</DefaultLayout>
