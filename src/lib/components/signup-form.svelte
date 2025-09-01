<script lang="ts">
	import { Label } from "$lib/components/ui/label";
	import { Input } from "$lib/components/ui/input";
	import { Button } from "$lib/components/ui/button";
	import { cn, type WithElementRef } from "$lib/utils";

	import { auth } from "$lib/stores/auth";
	import { goto } from "$app/navigation";

	let {
		ref = $bindable<HTMLFormElement | null>(null),
		class: className
	}: WithElementRef<HTMLFormElement> = $props();

	const id = $props.id();

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let department = $state('');
	let semester = $state('');
	let isLoading = $state(false);
	let error = $state('');

	async function handleSubmit(e: Event) {
		e.preventDefault();
		isLoading = true;
		error = '';

		// Validate passwords match
		if (password !== confirmPassword) {
			error = 'Passwords do not match';
			isLoading = false;
			return;
		}

		try {
			const userData = {
				name,
				email,
				department,
				semester,
				is_mentor: false
			};

			const { data, error: authError } = await auth.signUp(email, password, userData);
			
			if (authError) {
				error = authError.message;
			} else if (data?.user) {
				// Redirect to signin page after successful signup
				goto('/auth/signin');
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'An error occurred';
		} finally {
			isLoading = false;
		}
	}
</script>

<form class={cn("flex flex-col gap-6", className)} bind:this={ref} onsubmit={handleSubmit}>
	<div class="flex flex-col items-center gap-2 text-center">
		<h1 class="text-2xl font-bold">Create an account</h1>
		<p class="text-muted-foreground text-balance text-sm">
			Enter your details below to create an account
		</p>
	</div>
	
	{#if error}
		<div class="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
			{error}
		</div>
	{/if}
	
	<div class="grid gap-6">
		<div class="grid gap-3">
			<Label for="name-{id}">Full Name</Label>
			<Input 
				id="name-{id}" 
				type="text" 
				placeholder="John Doe" 
				bind:value={name}
				required 
			/>
		</div>
		
		<div class="grid gap-3">
			<Label for="email-{id}">Email</Label>
			<Input 
				id="email-{id}" 
				type="email" 
				placeholder="m@example.com" 
				bind:value={email}
				required 
			/>
		</div>
		
		<div class="grid gap-3">
			<Label for="department-{id}">Department</Label>
			<Input 
				id="department-{id}" 
				type="text" 
				placeholder="Computer Science" 
				bind:value={department}
				required 
			/>
		</div>
		
		<div class="grid gap-3">
			<Label for="semester-{id}">Semester</Label>
			<Input 
				id="semester-{id}" 
				type="text" 
				placeholder="5th Semester" 
				bind:value={semester}
				required 
			/>
		</div>
		

		
		<div class="grid gap-3">
			<Label for="password-{id}">Password</Label>
			<Input 
				id="password-{id}" 
				type="password" 
				bind:value={password}
				required 
			/>
		</div>
		
        <div class="grid gap-3">
			<Label for="confirm-password-{id}">Confirm Password</Label>
			<Input 
				id="confirm-password-{id}" 
				type="password" 
				bind:value={confirmPassword}
				required 
			/>
		</div>

		<Button type="submit" class="w-full" disabled={isLoading}>
			{isLoading ? 'Creating account...' : 'Sign up'}
		</Button>
	</div>
	<div class="text-center text-sm">
		Already have an account?
		<a href="/auth/signin" class="underline underline-offset-4"> Sign in </a>
	</div>
</form>
