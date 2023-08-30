import axios from 'axios';
import { useEffect, useState } from 'react';
import { Link, Outlet, redirect, useNavigate, useHref } from 'react-router-dom';

import { useGlobalStore } from '@/store';
import { useSupabase } from '@/lib/supabase';
import { MainNav } from './components/main-nav';
import TeamSwitcher from './components/availability-toggle';
import { UserNav } from './components/user-nav';

const BASE_URL = import.meta.env.VITE_BASE_URL;

export async function loader() {
	const token = localStorage.getItem('accessToken');
	if (!token) {
		return redirect('/sign-in');
	}
	const me = await axios.get(BASE_URL + '/users/me', {
		headers: {
			Authorization: token,
		},
	});
	const { data } = await axios.get(BASE_URL + '/user-queue', {
		headers: {
			Authorization: token,
		},
	});

	useGlobalStore.setState({
		user: me.data,
		conversations: (
			await supabase
				.from('Tickets')
				.select('*', { count: 'exact' })
				.eq('status', 'in progress')
				.eq('UserId', me.data.id)
		).count,
		isAvailable: data.isAvailable,
	});

	return null;
}

export default function RootRoute() {
	const user = useGlobalStore((store) => store.user);
	const navigate = useNavigate();
	const href = useHref();
	const supabase = useSupabase();

	useEffect(() => {
		if (supabase) {
			supabase
				.channel('schema-db-changes')
				.on(
					'postgres_changes',
					{
						event: 'UPDATE',
						schema: 'public',
						table: 'Tickets',
						filter:
							user.role === 'staff'
								? `UserId=eq.${user.id}`
								: undefined,
					},
					() => navigate(href),
				)
				.subscribe();
		}
	});

	return (
		<div className="hidden flex-col md:flex">
			<div className="border-b">
				<div className="flex h-16 items-center px-4">
					<Link to="/" className="font-bungee text-2xl">
						YUJIN
					</Link>

					<MainNav className="mx-6" />
					<div className="ml-auto flex items-center space-x-4">
						<TeamSwitcher />
						<UserNav />
					</div>
				</div>
			</div>
			<main>
				<Outlet />
			</main>
		</div>
	);
}
