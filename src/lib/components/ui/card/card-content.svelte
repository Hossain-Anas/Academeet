<script>
  let { class: className = '' } = $props();
</script>

<div class="p-6 pt-0 {className}">
  <slot />
</div>
