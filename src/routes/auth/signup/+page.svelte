<script lang="ts">
	import GalleryVerticalEndIcon from "@lucide/svelte/icons/gallery-vertical-end";
	import LoginForm from "$lib/components/signup-form.svelte";
</script>

<div class="grid min-h-svh lg:grid-cols-2">
	<div class="flex flex-col gap-4 p-6 md:p-10">
		<div class="flex justify-center gap-2 md:justify-start">
			<a href="##" class="flex items-center gap-2 font-medium">
				<div
					class="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md"
				>
					<GalleryVerticalEndIcon class="size-4" />
				</div>
				Academeet
			</a>
		</div>
		<div class="flex flex-1 items-center justify-center">
			<div class="w-full max-w-xs">
				<LoginForm />
			</div>
		</div>
	</div>
	<div class="bg-muted relative hidden lg:block" style="background-color: HSL(222.2 47.4% 11.2%);">
		<img
			src="/signin_and_signup_img2.jpg"
			alt="placeholder"
			class="w-full h-full object-contain"
		/>
	</div>
</div>

