import React, { useState } from 'react';
import { adminAPI } from '../../services/api';
import { Check, ChevronLeft, ChevronRight, X, Upload } from 'lucide-react';

export default function OnboardingWizard({ onClose, onComplete }) {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'staff',
        skills: [],
        availability: '',
        documentUploaded: false
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [currentSkill, setCurrentSkill] = useState('');

    const handleNext = () => setStep(prev => Math.min(prev + 1, 5));
    const handlePrev = () => setStep(prev => Math.max(prev - 1, 1));

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const addSkill = () => {
        if (currentSkill.trim() && !formData.skills.includes(currentSkill.trim())) {
            setFormData({ ...formData, skills: [...formData.skills, currentSkill.trim()] });
            setCurrentSkill('');
        }
    };

    const removeSkill = (skill) => {
        setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
    };

    const handleSubmit = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Create User
            const createRes = await adminAPI.createUser({
                name: formData.name,
                email: formData.email,
                password: formData.password,
                role: formData.role
            });
            const userId = createRes.data.user_id;

            // 2. Update additional info
            await adminAPI.updateUser(userId, {
                skills: formData.skills,
                availability: formData.availability
            });

            onComplete();
        } catch (err) {
            setError(err.response?.data?.detail || "Failed to onboard staff");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl animate-scale-in">
                {/* Header */}
                <div className="p-6 border-b border-[#EBE5DB] flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>Staff Onboarding</h2>
                        <p className="text-sm text-[#5C5C5C]">Step {step} of 5</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-[#5C5C5C] hover:bg-[#EBE5DB] rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-[#EBE5DB]">
                    <div className="h-full bg-[#C9A84C] transition-all duration-300" style={{ width: `${(step / 5) * 100}%` }} />
                </div>

                <div className="p-8 min-h-[350px]">
                    {error && <div className="mb-4 p-3 bg-[#FBE9E7] text-[#BF360C] text-sm rounded-lg">{error}</div>}

                    {step === 1 && (
                        <div className="space-y-4 animate-fade-in">
                            <h3 className="text-lg font-bold text-[#2D2D2D]">Personal Information</h3>
                            <div>
                                <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Full Name</label>
                                <input name="name" className="input-wedding" value={formData.name} onChange={handleChange} placeholder="John Doe" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Email Address</label>
                                <input name="email" type="email" className="input-wedding" value={formData.email} onChange={handleChange} placeholder="john@ubukwehub.com" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Temporary Password</label>
                                <input name="password" type="password" className="input-wedding" value={formData.password} onChange={handleChange} placeholder="••••••••" />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-fade-in">
                            <h3 className="text-lg font-bold text-[#2D2D2D]">Roles & Skills</h3>
                            <div>
                                <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Primary Role</label>
                                <select name="role" className="input-wedding" value={formData.role} onChange={handleChange}>
                                    <option value="staff">Event Staff</option>
                                    <option value="admin">System Admin</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Skills</label>
                                <div className="flex gap-2 mb-2">
                                    <input className="input-wedding flex-1" value={currentSkill} onChange={(e) => setCurrentSkill(e.target.value)} placeholder="e.g. Photography, Decor, MC" onKeyDown={(e) => e.key === 'Enter' && addSkill()} />
                                    <button onClick={addSkill} className="btn-gold px-4 text-sm font-semibold rounded-lg">Add</button>
                                </div>
                                <div className="flex gap-2 flex-wrap mt-3">
                                    {formData.skills.map(s => (
                                        <span key={s} className="px-3 py-1 bg-[#F5F0E8] text-[#5C5C5C] text-sm rounded-full flex items-center gap-1">
                                            {s} <X size={14} className="cursor-pointer hover:text-red-500" onClick={() => removeSkill(s)} />
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4 animate-fade-in">
                            <h3 className="text-lg font-bold text-[#2D2D2D]">Availability</h3>
                            <p className="text-sm text-[#5C5C5C]">When is this staff member generally available for shifts?</p>
                            <div>
                                <label className="block text-sm font-medium text-[#2D2D2D] mb-1">General Availability</label>
                                <textarea name="availability" rows={4} className="input-wedding py-3" value={formData.availability} onChange={handleChange} placeholder="e.g. Weekends only, Weekdays after 5PM..." />
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-4 animate-fade-in">
                            <h3 className="text-lg font-bold text-[#2D2D2D]">Required Documents</h3>
                            <p className="text-sm text-[#5C5C5C]">Upload any necessary identity or certification documents (Simulated).</p>
                            <div className={`mt-4 border-2 border-dashed ${formData.documentUploaded ? 'border-[#4A7C59] bg-[#E8F5EE]' : 'border-[#CCCCCC] bg-[#F9F9F9]'} rounded-xl p-8 flex flex-col items-center justify-center transition-all`}>
                                {formData.documentUploaded ? (
                                    <>
                                        <Check size={40} className="text-[#4A7C59] mb-3" />
                                        <p className="font-semibold text-[#4A7C59]">Documents Uploaded Successfully</p>
                                    </>
                                ) : (
                                    <>
                                        <Upload size={40} className="text-[#CCCCCC] mb-3" />
                                        <p className="text-[#5C5C5C] mb-4">Drag and drop files here, or click to browse</p>
                                        <button onClick={() => setFormData({ ...formData, documentUploaded: true })} className="btn-gold px-6 py-2 text-sm font-semibold">
                                            Simulate Upload
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="space-y-4 animate-fade-in text-center flex flex-col items-center justify-center mt-6">
                            <div className="w-16 h-16 bg-[#C9A84C15] rounded-full flex items-center justify-center mb-2">
                                <Check size={32} className="text-[#C9A84C]" />
                            </div>
                            <h3 className="text-xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display,serif' }}>Ready to Onboard</h3>
                            <p className="text-[#5C5C5C] max-w-sm">
                                You are about to create an account for <strong>{formData.name} ({formData.email})</strong> with the role <strong>{formData.role}</strong>.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-[#EBE5DB] flex justify-between bg-[#F9F9F9] rounded-b-2xl">
                    <button onClick={handlePrev} disabled={step === 1} className="px-5 h-11 border-2 border-[#EBE5DB] rounded-full text-[#5C5C5C] font-semibold text-sm disabled:opacity-50 flex items-center gap-2">
                        <ChevronLeft size={16} /> Back
                    </button>

                    {step < 5 ? (
                        <button onClick={handleNext} disabled={step === 1 && (!formData.name || !formData.email || !formData.password) || (step === 4 && !formData.documentUploaded)} className="btn-gold px-6 h-11 text-sm font-semibold flex items-center gap-2">
                            Next <ChevronRight size={16} />
                        </button>
                    ) : (
                        <button onClick={handleSubmit} disabled={loading} className="btn-gold px-8 h-11 text-sm font-semibold flex items-center gap-2">
                            {loading ? <span className="animate-spin">⏳</span> : 'Complete Onboarding'} <Check size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
