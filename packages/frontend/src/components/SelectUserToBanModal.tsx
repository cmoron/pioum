import { api, Ban, User } from "@/lib/api";
import { Avatar } from "./Avatar";
import { BanModal } from "./BanModal";
import { useEffect, useState } from "react";

interface SelectUserToBanModalPorps {
    me: User,
    bansGiven: Ban[],
    onClose: () => void
    onUserBanned: (ban: Ban) => void
}

export function SelectUserToBanModal({ me: me, bansGiven: bansGiven, onClose: onClose, onUserBanned: onUserBanned }: SelectUserToBanModalPorps) {

    const [userToBan, setUserToBan] = useState<User | undefined>();
    const [users, setUsers] = useState<User[] | null>();
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const { users } = await api.users();
                setUsers(users);
            } catch (error) {
                alert(error);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-warm p-6 w-full max-w-sm shadow-warm-xl border-2 border-primary-300">
                <h2 className="text-xl font-bold mb-4 text-primary-800">Qui a fauté?</h2>
                {users && users.filter(u => u.id != me?.id).map((user) => {
                    let isUserAlreadyBanned = false;
                    if (bansGiven.find(b => b.receiverId === user.id)) {
                        isUserAlreadyBanned = true;
                    }
                    if (isUserAlreadyBanned) {
                        return <div key={user.id} className="flex items-center gap-3 mb-4 p-3 bg-primary-50 rounded-warm border border-primary-200">
                            <Avatar user={user} size="md" />
                            <div className="flex-1">
                                <p className="font-medium text-primary-800">{user.name}</p>
                                <p className="text-sm text-primary-600">Vous avez déjà banni cette personne</p>
                            </div>
                        </div>
                    } else {
                        return <div key={user.id} className="flex items-center gap-3 mb-4 p-3 bg-primary-50 rounded-warm border border-primary-200" onClick={() => setUserToBan(user)}>
                            <Avatar user={user} size="md" />
                            <div className="flex-1">
                                <p className="font-medium text-primary-800">{user.name}</p>
                            </div>
                        </div>
                    }

                })}
                {userToBan && <BanModal user={{ id: userToBan.id, name: userToBan.name }} onBanned={(ban) => onUserBanned!(ban)} onClose={() => {
                    setUserToBan(undefined)
                    onClose()
                }} />}
                <div className="flex gap-2">
                    <button
                        onClick={() => onClose()}
                        className="btn-secondary flex-1"
                        disabled={loading}
                    >
                        Annuler
                    </button>
                </div>
            </div>
        </div>
    );
}