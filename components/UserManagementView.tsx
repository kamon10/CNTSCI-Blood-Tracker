
import React, { useState, useEffect } from 'react';
import { User, CNTSCI_CENTERS } from '../types.ts';
import InputGroup from './InputGroup.tsx';

interface UserManagementViewProps {
  scriptUrl: string;
  onRefresh: () => void;
  isSyncing: boolean;
}

const UserManagementView: React.FC<UserManagementViewProps> = ({ scriptUrl, onRefresh, isSyncing }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState<User>({
    nomAgent: '',
    login: '',
    motDePasse: '',
    centreAffectation: CNTSCI_CENTERS[0]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const resp = await fetch(`${scriptUrl.trim()}?action=get_users&_t=${Date.now()}`);
      if (resp.ok) {
        const data = await resp.json();
        setUsers(data);
      }
    } catch (e) {
      console.error("Erreur fetch users:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [scriptUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const params = new URLSearchParams();
    params.append('action', 'post_user');
    params.append('nomAgent', newUser.nomAgent);
    params.append('login', newUser.login);
    params.append('motDePasse', newUser.motDePasse);
    params.append('centreAffectation', newUser.centreAffectation);

    try {
      const resp = await fetch(`${scriptUrl.trim()}?${params.toString()}`);
      if (resp.ok) {
        setNewUser({
          nomAgent: '',
          login: '',
          motDePasse: '',
          centreAffectation: CNTSCI_CENTERS[0]
        });
        fetchUsers();
        onRefresh();
      }
    } catch (e) {
      console.error("Erreur post user:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* FORMULAIRE DE CRÉATION */}
      <div className="lg:col-span-4">
        <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl border border-white/5 sticky top-28">
          <h2 className="text-xs font-black uppercase tracking-widest text-white mb-8 flex items-center gap-3">
            <i className="fa-solid fa-user-plus text-indigo-500"></i> Nouvel Agent
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <InputGroup label="Nom complet" icon={<i className="fa-solid fa-id-card text-slate-500"></i>}>
              <input 
                type="text" 
                value={newUser.nomAgent}
                onChange={e => setNewUser({...newUser, nomAgent: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:border-indigo-500 outline-none transition-all"
                required
              />
            </InputGroup>

            <InputGroup label="Identifiant (Login)" icon={<i className="fa-solid fa-at text-slate-500"></i>}>
              <input 
                type="text" 
                value={newUser.login}
                onChange={e => setNewUser({...newUser, login: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:border-indigo-500 outline-none transition-all"
                required
              />
            </InputGroup>

            <InputGroup label="Mot de passe" icon={<i className="fa-solid fa-lock text-slate-500"></i>}>
              <input 
                type="text" 
                value={newUser.motDePasse}
                onChange={e => setNewUser({...newUser, motDePasse: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:border-indigo-500 outline-none transition-all"
                required
              />
            </InputGroup>

            <InputGroup label="Affectation" icon={<i className="fa-solid fa-building-circle-check text-slate-500"></i>}>
              <select 
                value={newUser.centreAffectation}
                onChange={e => setNewUser({...newUser, centreAffectation: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs font-bold text-white focus:border-indigo-500 outline-none transition-all"
              >
                <option value="TOUS LES CENTRES CNTSCI">ADMINISTRATION GLOBALE</option>
                {CNTSCI_CENTERS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </InputGroup>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-3"
            >
              {isSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-shield-halved"></i>}
              Enregistrer l'agent
            </button>
          </form>
        </div>
      </div>

      {/* LISTE DES AGENTS */}
      <div className="lg:col-span-8">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100">
          <div className="flex items-center justify-between mb-10">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-3">
              <i className="fa-solid fa-users-gear text-indigo-600"></i> Répertoire des Agents ({users.length})
            </h2>
            <button 
              onClick={fetchUsers}
              className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all"
            >
              <i className={`fa-solid fa-rotate ${isLoading ? 'fa-spin' : ''}`}></i>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {users.map((user, idx) => (
              <div key={idx} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 hover:border-indigo-200 transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-300 text-xl group-hover:text-indigo-600 group-hover:shadow-lg transition-all">
                    <i className="fa-solid fa-user-tie"></i>
                  </div>
                  <span className={`text-[8px] font-black uppercase px-3 py-1 rounded-full border ${
                    user.centreAffectation.includes('DIRECTION') 
                    ? 'bg-indigo-50 text-indigo-600 border-indigo-100' 
                    : 'bg-green-50 text-green-600 border-green-100'
                  }`}>
                    {user.centreAffectation.includes('DIRECTION') ? 'ADMIN' : 'AGENT'}
                  </span>
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase truncate mb-1">{user.nomAgent}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-4 truncate">{user.centreAffectation}</p>
                
                <div className="flex gap-2 pt-4 border-t border-slate-100">
                  <div className="flex-1 bg-white px-3 py-2 rounded-xl text-[9px] font-bold text-slate-500">
                    <i className="fa-solid fa-at mr-2 opacity-30"></i>{user.login}
                  </div>
                  <div className="flex-1 bg-white px-3 py-2 rounded-xl text-[9px] font-bold text-slate-500">
                    <i className="fa-solid fa-key mr-2 opacity-30"></i>••••
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {users.length === 0 && !isLoading && (
            <div className="text-center py-20 text-slate-300 uppercase font-black text-[10px] italic">
              Aucun agent configuré
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserManagementView;
