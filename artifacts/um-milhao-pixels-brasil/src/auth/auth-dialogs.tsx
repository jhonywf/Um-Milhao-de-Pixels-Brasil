import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { Check, Eye, EyeOff, ImagePlus, KeyRound, LogOut, Mail, UserRound, X } from 'lucide-react';
import { useAuth } from './auth-context';
import { supabasePublicStorageUrl, uploadProfileAvatar } from './auth-service';

function DialogShell({
  children,
  onClose,
  labelledBy,
}: {
  children: ReactNode;
  onClose: () => void;
  labelledBy: string;
}) {
  return (
    <div className="account-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="account-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="account-dialog-close" type="button" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>
        {children}
      </section>
    </div>
  );
}

export function AuthDialogs() {
  const {
    authDialogOpen,
    closeAuth,
    profileDialogOpen,
    closeProfile,
    passwordRecoveryOpen,
    closePasswordRecovery,
    session,
    user,
  } = useAuth();
  return (
    <>
      {authDialogOpen && <AuthDialog onClose={closeAuth} />}
      {profileDialogOpen && user && <ProfileDialog onClose={closeProfile} />}
      {passwordRecoveryOpen && session && <PasswordRecoveryDialog onClose={closePasswordRecovery} />}
    </>
  );
}

function AuthDialog({ onClose }: { onClose: () => void }) {
  const { login, signup, loginWithGoogle, requestPasswordReset, error, clearError } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmationNotice, setConfirmationNotice] = useState(false);
  const [resetNotice, setResetNotice] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const switchMode = (nextMode: 'login' | 'signup') => {
    setMode(nextMode);
    setFormError(null);
    clearError();
    setConfirmationNotice(false);
    setResetNotice(false);
  };

  const sendReset = async () => {
    setFormError(null);
    clearError();
    if (!email.trim()) {
      setFormError('Informe seu e-mail para receber o link de recuperação.');
      return;
    }
    setBusy(true);
    try {
      await requestPasswordReset(email.trim());
      setResetNotice(true);
    } catch {
      // The provider error is rendered below the form.
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (mode === 'signup' && password !== confirmPassword) {
      setFormError('As senhas precisam ser iguais.');
      return;
    }
    if (password.length < 6) {
      setFormError('Use pelo menos 6 caracteres na senha.');
      return;
    }
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        const result = await signup(email, password);
        if (result.needsEmailConfirmation) setConfirmationNotice(true);
      }
    } catch {
      // The provider error is rendered below the form.
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogShell onClose={onClose} labelledBy="auth-dialog-title">
      <div className="account-dialog-kicker"><span className="eyebrow-dot" /> sua marca começa aqui</div>
      <h2 id="auth-dialog-title">{mode === 'login' ? 'Entre na parede.' : 'Crie sua conta.'}</h2>
      <p className="account-dialog-intro">
        {mode === 'login'
          ? 'Entre para guardar seu perfil e acompanhar suas próximas marcas.'
          : 'Um perfil público para sua marca. Seu e-mail nunca aparece na parede.'}
      </p>
      {confirmationNotice || resetNotice ? (
        <div className="account-success" role="status">
          <Check size={18} />
          <div>
            <strong>Confira seu e-mail.</strong>
            <span>{resetNotice ? 'Enviamos um link para redefinir sua senha.' : 'Enviamos um link de confirmação para você continuar.'}</span>
          </div>
        </div>
      ) : (
        <>
          <button className="google-button" type="button" onClick={() => void loginWithGoogle()} disabled={busy}>
            <span className="google-mark">G</span> Continuar com Google
          </button>
          <div className="account-divider"><span>ou use seu e-mail</span></div>
          <form className="account-form" onSubmit={submit}>
            <label>
              E-mail
              <span className="account-input-wrap"><Mail size={15} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" placeholder="voce@email.com" /></span>
            </label>
            <label>
              Senha
              <span className="account-input-wrap"><input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder="mínimo de 6 caracteres" /><button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={15} /> : <Eye size={15} />}</button></span>
            </label>
            {mode === 'signup' && (
              <label>
                Repita a senha
                <span className="account-input-wrap"><input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required autoComplete="new-password" placeholder="repita sua senha" /></span>
              </label>
            )}
            {mode === 'login' && (
              <button className="account-link-button" type="button" onClick={() => void sendReset()} disabled={busy}>
                Esqueci minha senha
              </button>
            )}
            {(formError || error) && <p className="account-error" role="alert">{formError || error}</p>}
            <button className="account-submit" type="submit" disabled={busy}>
              {busy ? 'aguarde…' : mode === 'login' ? 'Entrar na conta' : 'Criar minha conta'}
            </button>
          </form>
        </>
      )}
      <p className="account-switch">
        {mode === 'login' ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'}
        <button type="button" onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}>
          {mode === 'login' ? 'Criar agora' : 'Entrar'}
        </button>
      </p>
      <small className="account-legal">Ao continuar, você concorda com os termos e a política de privacidade.</small>
    </DialogShell>
  );
}

function PasswordRecoveryDialog({ onClose }: { onClose: () => void }) {
  const { updatePassword, error, clearError } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    clearError();
    if (password.length < 6) {
      setFormError('Use pelo menos 6 caracteres na senha.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('As senhas precisam ser iguais.');
      return;
    }
    setBusy(true);
    try {
      await updatePassword(password);
      onClose();
    } catch {
      // The provider error is rendered below the form.
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogShell onClose={onClose} labelledBy="password-recovery-dialog-title">
      <div className="account-dialog-kicker"><KeyRound size={14} /> acesso seguro</div>
      <h2 id="password-recovery-dialog-title">Crie uma nova senha.</h2>
      <p className="account-dialog-intro">Escolha uma senha nova para voltar à sua conta.</p>
      <form className="account-form" onSubmit={submit}>
        <label>
          Nova senha
          <span className="account-input-wrap">
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="new-password" placeholder="mínimo de 6 caracteres" />
            <button type="button" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPassword((visible) => !visible)}>
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </span>
        </label>
        <label>
          Repita a nova senha
          <span className="account-input-wrap">
            <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required autoComplete="new-password" placeholder="repita sua senha" />
          </span>
        </label>
        {(formError || error) && <p className="account-error" role="alert">{formError || error}</p>}
        <button className="account-submit" type="submit" disabled={busy}>
          {busy ? 'salvando…' : 'Salvar nova senha'} <Check size={16} />
        </button>
      </form>
    </DialogShell>
  );
}

function ProfileDialog({ onClose }: { onClose: () => void }) {
  const { user, profile, session, updateProfile, logout, error, clearError } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarEmoji, setAvatarEmoji] = useState('✦');
  const [avatarPath, setAvatarPath] = useState('');
  const [socialNetwork, setSocialNetwork] = useState<'instagram' | 'tiktok' | 'youtube' | ''>('');
  const [socialHandle, setSocialHandle] = useState('');
  const [website, setWebsite] = useState('');
  const [city, setCity] = useState('');
  const [bio, setBio] = useState('');
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [publicProfile, setPublicProfile] = useState(false);
  const [publicSocial, setPublicSocial] = useState(false);
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setUsername(profile?.username ?? '');
    setDisplayName(profile?.display_name ?? '');
    setAvatarEmoji(profile?.avatar_emoji ?? '✦');
    setAvatarPath(profile?.avatar_path ?? '');
    setSocialNetwork(profile?.social_network ?? '');
    setSocialHandle(profile?.social_handle ?? '');
    setWebsite(profile?.website ?? '');
    setCity(profile?.city ?? '');
    setBio(profile?.bio ?? '');
    setTerms(profile?.consent_terms ?? false);
    setPrivacy(profile?.consent_privacy ?? false);
    setMarketing(profile?.consent_marketing ?? false);
    setPublicProfile(profile?.consent_public_profile ?? false);
    setPublicSocial(profile?.consent_public_social ?? false);
    setFormError(null);
  }, [profile]);

  const chooseAvatar = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user || !session) return;
    const allowedAvatarTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    if (!allowedAvatarTypes.has(file.type) || file.size > 5 * 1024 * 1024) {
      setFormError('Escolha uma imagem JPG, PNG, WEBP ou GIF de até 5 MB.');
      return;
    }
    setAvatarBusy(true);
    setFormError(null);
    try {
      const path = await uploadProfileAvatar(user.id, session.access_token, file);
      setAvatarPath(path);
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Não foi possível enviar a imagem.');
    } finally {
      setAvatarBusy(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    clearError();
    if (!/^[a-z0-9_]{3,24}$/.test(username.trim().toLowerCase())) {
      setFormError('Escolha um username de 3 a 24 caracteres, usando letras, números ou _.');
      return;
    }
    if (!terms || !privacy) {
      setFormError('Você precisa aceitar os termos e a política de privacidade.');
      return;
    }
    if (socialNetwork && !socialHandle.trim()) {
      setFormError('Informe o handle da rede social escolhida.');
      return;
    }
    if (publicSocial && (!socialNetwork || !socialHandle.trim())) {
      setFormError('Escolha uma rede e informe o handle para exibir sua rede social.');
      return;
    }
    setBusy(true);
    try {
      await updateProfile({
        username,
        display_name: displayName,
        avatar_emoji: avatarEmoji,
        avatar_path: avatarPath,
        social_network: socialNetwork || null,
        social_handle: socialHandle,
        website,
        city,
        bio,
        consent_terms: terms,
        consent_privacy: privacy,
        consent_marketing: marketing,
        consent_public_profile: publicProfile,
        consent_public_social: publicSocial,
      });
    } catch {
      // The provider error is rendered below the form.
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogShell onClose={onClose} labelledBy="profile-dialog-title">
      <div className="account-dialog-kicker"><UserRound size={14} /> seu lugar na parede</div>
      <h2 id="profile-dialog-title">Quem está deixando essa marca?</h2>
      <p className="account-dialog-intro">Monte seu perfil público. O e-mail abaixo fica privado e só serve para sua conta.</p>
      <form className="account-form profile-form" onSubmit={submit}>
        <div className="profile-identity-row">
          <div className="profile-avatar">
            {avatarPath ? <img src={supabasePublicStorageUrl(avatarPath)} alt="" /> : avatarEmoji}
          </div>
          <label className="profile-username">
            Username
            <span className="account-input-wrap"><span className="input-prefix">@</span><input value={username} onChange={(event) => setUsername(event.target.value.replace(/\s/g, '').toLowerCase())} required placeholder="seunome" /></span>
          </label>
          <label className="profile-emoji">
            Marca
            <input className="emoji-input" value={avatarEmoji} onChange={(event) => setAvatarEmoji(event.target.value.slice(0, 2) || '✦')} aria-label="Emoji do avatar" />
          </label>
        </div>
        <label className="profile-avatar-upload">
          <span><ImagePlus size={14} /> Foto de perfil (opcional)</span>
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(event) => void chooseAvatar(event)} disabled={avatarBusy} />
          <small>{avatarBusy ? 'enviando…' : 'JPG, PNG, WEBP ou GIF · até 5 MB'}</small>
        </label>
        <label>
          Nome para aparecer
          <span className="account-input-wrap"><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Seu nome ou projeto" /></span>
        </label>
        <div className="profile-two-columns">
          <label>
            Rede social
            <span className="account-input-wrap"><select value={socialNetwork} onChange={(event) => { const next = event.target.value as typeof socialNetwork; setSocialNetwork(next); if (!next) { setSocialHandle(''); setPublicSocial(false); } }}><option value="">Nenhuma</option><option value="instagram">Instagram</option><option value="tiktok">TikTok</option><option value="youtube">YouTube</option></select></span>
          </label>
          <label>
            Handle
            <span className="account-input-wrap"><span className="input-prefix">@</span><input value={socialHandle} onChange={(event) => setSocialHandle(event.target.value.replace(/^@/, ''))} placeholder="seuhandle" disabled={!socialNetwork} /></span>
          </label>
          <label>
            Cidade
            <span className="account-input-wrap"><input value={city} onChange={(event) => setCity(event.target.value)} placeholder="Fortaleza, CE" /></span>
          </label>
        </div>
        <label>
          Site
          <span className="account-input-wrap"><input type="url" value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="https://seusite.com" /></span>
        </label>
        <label>
          Uma frase sobre você
          <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={160} placeholder="O que você quer deixar no mapa?" />
        </label>
        <div className="profile-private-email"><Mail size={14} /><span><b>{user?.email}</b><small>e-mail privado</small></span></div>
        <label className="consent-row"><input type="checkbox" checked={terms} onChange={(event) => setTerms(event.target.checked)} /><span>Li e aceito os <u>termos de uso</u>.</span></label>
        <label className="consent-row"><input type="checkbox" checked={privacy} onChange={(event) => setPrivacy(event.target.checked)} /><span>Li e aceito a <u>política de privacidade</u>.</span></label>
        <label className="consent-row"><input type="checkbox" checked={publicProfile} onChange={(event) => { const next = event.target.checked; setPublicProfile(next); if (!next) setPublicSocial(false); }} /><span>Quero que meu perfil apareça publicamente no projeto.</span></label>
        <label className="consent-row"><input type="checkbox" checked={publicSocial} onChange={(event) => setPublicSocial(event.target.checked)} disabled={!socialNetwork || !publicProfile} /><span>Quero que minha rede social apareça publicamente no projeto.</span></label>
        <label className="consent-row"><input type="checkbox" checked={marketing} onChange={(event) => setMarketing(event.target.checked)} /><span>Quero receber novidades, recordes e oportunidades do Um Milhão de Pixels Brasil por e-mail <small>(opcional)</small>.</span></label>
        {(formError || error) && <p className="account-error" role="alert">{formError || error}</p>}
        <button className="account-submit" type="submit" disabled={busy}>{busy ? 'salvando…' : 'Salvar meu perfil'} <Check size={16} /></button>
      </form>
      <button className="account-logout" type="button" onClick={() => void logout()}><LogOut size={14} /> Sair da conta</button>
    </DialogShell>
  );
}