import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

import dynamic from 'next/dynamic';
const WeeklyChart = dynamic(() => import('../components/WeeklyChart'), { ssr: false });


export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [meals, setMeals] = useState([]);
  const [newMeal, setNewMeal] = useState({ name: '', calories: '', protein: '', carbs: '', fat: '' });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/');
      const { data: prof } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
      if (!prof) return router.replace('/onboarding');
      setProfile(prof);
      await getMeals(user.id);
    })();
  }, [router]);

  const getMeals = async (uid) => {
    const { data } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', uid)
      .order('date', { ascending: true });
    setMeals(data || []);
  };

  const addMeal = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('meals').insert({
      user_id: user.id,
      date: new Date().toISOString().split('T')[0],
      meal_name: newMeal.name,
      calories: parseInt(newMeal.calories || 0, 10),
      protein: parseInt(newMeal.protein || 0, 10),
      carbs: parseInt(newMeal.carbs || 0, 10),
      fat: parseInt(newMeal.fat || 0, 10)
    });
    setNewMeal({ name: '', calories: '', protein: '', carbs: '', fat: '' });
    await getMeals(user.id);
  };

  const totals = meals.reduce((acc, m) => ({
    calories: acc.calories + (m.calories || 0),
    protein:  acc.protein  + (m.protein  || 0),
    carbs:    acc.carbs    + (m.carbs    || 0),
    fat:      acc.fat      + (m.fat      || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  if (!profile) return <div className="p-6 text-white">Loading...</div>;

  return (
    <div className="bg-purple5 text-white min-h-screen p-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl">Welcome, {profile.name}</h1>
        <button
          onClick={async () => { await supabase.auth.signOut(); router.replace('/'); }}
          className="px-3 py-2 rounded bg-purple3 hover:bg-purple2"
        >
          Sign out
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card label="Calories" value={`${totals.calories} / ${profile.calories}`} />
        <Card label="Protein"  value={`${totals.protein}g / ${profile.protein}g`} />
        <Card label="Carbs"    value={`${totals.carbs}g / ${profile.carbs}g`} />
        <Card label="Fat"      value={`${totals.fat}g / ${profile.fat}g`} />
      </div>

      <div className="mb-6 bg-purple4 p-4 rounded-2xl">
        <h2 className="text-lg mb-3">Add Meal</h2>
        <input placeholder="Meal name" value={newMeal.name} onChange={e => setNewMeal({ ...newMeal, name: e.target.value })} className="bg-purple3 p-3 rounded mb-2 w-full" />
        {['calories','protein','carbs','fat'].map(field => (
          <input
            key={field}
            placeholder={field}
            value={newMeal[field]}
            onChange={e => setNewMeal({ ...newMeal, [field]: e.target.value })}
            className="bg-purple3 p-3 rounded mb-2 w-full"
          />
        ))}
        <button onClick={addMeal} className="bg-purple1 w-full py-3 rounded hover:bg-purple2">Add Meal</button>
      </div>

      <WeeklyChart meals={meals} />
    </div>
  );
}

function Card({ label, value }) {
  return (
    <div className="bg-purple4 p-4 rounded-2xl">
      <div className="text-sm opacity-90">{label}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  );
}
