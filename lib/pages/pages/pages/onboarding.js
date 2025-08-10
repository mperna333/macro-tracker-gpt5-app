import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useRouter } from 'next/router';

export default function Onboarding() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    age: '',
    gender: 'female',
    height: '',
    weight: '',
    activity: 'moderate',
    goal: 'maintain'
  });
  const [userId, setUserId] = useState(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.replace('/');
      setUserId(user.id);
      // If profile exists, skip
      const { data } = await supabase.from('users').select('*').eq('id', user.id).maybeSingle();
      if (data) router.replace('/dashboard');
    })();
  }, [router]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const calculateMacros = (weight, height, age, gender, activity, goal) => {
    const w = parseFloat(weight);     // kg if metric; if lbs you can adapt later
    const h = parseFloat(height);     // cm if metric
    const a = parseInt(age, 10);

    // Mifflin-St Jeor (metric)
    let bmr = gender === 'male'
      ? 10 * w + 6.25 * h - 5 * a + 5
      : 10 * w + 6.25 * h - 5 * a - 161;

    const mult = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725 };
    let calories = bmr * (mult[activity] || 1.55);

    if (goal === 'lose') calories -= 500;
    if (goal === 'gain') calories += 500;

    const protein = Math.round(w * 2);               // 2 g/kg
    const fat = Math.round((calories * 0.25) / 9);   // 25% calories
    const carbs = Math.round((calories - (protein * 4 + fat * 9)) / 4);

    return { calories: Math.round(calories), protein, fat, carbs };
  };

  const handleSubmit = async () => {
    try {
      if (!userId) return;
      const { calories, protein, fat, carbs } = calculateMacros(
        form.weight, form.height, form.age, form.gender, form.activity, form.goal
      );
      const { error } = await supabase.from('users').insert({
        id: userId, ...form, calories, protein, fat, carbs
      });
      if (error) throw error;
      router.push('/dashboard');
    } catch (e) {
      setMsg(e.message);
    }
  };

  return (
    <div className="bg-purple5 text-white min-h-screen flex justify-center p-4">
      <div className="bg-purple4 p-6 rounded-2xl w-full max-w-lg space-y-3">
        <h1 className="text-2xl mb-2 font-bold">Set Up Your Profile</h1>

        <input name="name" placeholder="Name" onChange={handleChange} className="w-full p-3 rounded bg-purple3" />
        <div className="grid grid-cols-2 gap-3">
          <input name="age" placeholder="Age (years)" onChange={handleChange} className="p-3 rounded bg-purple3" />
          <select name="gender" onChange={handleChange} className="p-3 rounded bg-purple3">
            <option value="female">Female</option><option value="male">Male</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input name="height" placeholder="Height (cm)" onChange={handleChange} className="p-3 rounded bg-purple3" />
          <input name="weight" placeholder="Weight (kg)" onChange={handleChange} className="p-3 rounded bg-purple3" />
        </div>
        <select name="activity" onChange={handleChange} className="w-full p-3 rounded bg-purple3">
          <option value="sedentary">Sedentary</option>
          <option value="light">Light</option>
          <option value="moderate">Moderate</option>
          <option value="active">Very Active</option>
        </select>
        <select name="goal" onChange={handleChange} className="w-full p-3 rounded bg-purple3">
          <option value="maintain">Maintain</option>
          <option value="lose">Lose</option>
          <option value="gain">Gain</option>
        </select>

        <button onClick={handleSubmit} className="bg-purple1 w-full py-3 rounded hover:bg-purple2">Save & Continue</button>
        {msg && <p className="text-sm opacity-90">{msg}</p>}
      </div>
    </div>
  );
}
