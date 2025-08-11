import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function WeeklyChart({ meals }) {
  const days = {};
  meals.forEach(meal => {
    if (!days[meal.date]) days[meal.date] = { date: meal.date, calories: 0, protein: 0 };
    days[meal.date].calories += meal.calories || 0;
    days[meal.date].protein  += meal.protein  || 0;
  });

  const data = Object.values(days).slice(-7);

  return (
    <div className="bg-purple4 p-4 rounded-2xl">
      <h2 className="text-lg mb-3">Last 7 Days</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <XAxis dataKey="date" stroke="#fff" />
          <YAxis stroke="#fff" />
          <Tooltip />
          <Legend />
          <Bar dataKey="calories" fill="#9E72C3" />
          <Bar dataKey="protein"  fill="#924DBF" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
