import { VaporizeDev } from './VaporizeDevOld'

interface StudentMockModalProps {
  isOpen: boolean
  onClose: () => void
}

// Zmockowane stałe dane kursanta
const MOCK_STUDENT = {
  firstName: "Jan",
  lastName: "Kowalski",
  email: "jan.kowalski@example.com",
  phoneNumber: "+48 123 456 789",
  isActive: true,
  studentProfile: {
    licenseCategory: "B",
    pkkNumber: "12345678901234567890",
    innerTheoryHours: 10,
    isInnerPracticalTestPassed: false,
    homeAddress: "ul. Kwiatowa 1, 00-001 Warszawa",
    notes: "Bardzo chętny do nauki makieta kursanta.",
    theoryTestAttempts: 1,
    practicalTestAttempts: 0,
    innerTheoryTestAttempts: 1,
    drivenMinutes: 600, // 10 godzin
    isTheoryTestPassed: true,
    isPracticalTestPassed: false,
    isInnerTheoryTestPassed: true,
    status: "IN_PROGRESS",
  },
}

export default function StudentMockModal({ isOpen, onClose }: StudentMockModalProps) {
  if (!isOpen) return null

  // Komponent używa wyłącznie standardowych styli inline.
  // Dzięki temu zadziała w każdym pustym środowisku React.
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: "1rem", fontFamily: "sans-serif" }}>
      <VaporizeDev>
      <div style={{ position: "relative", backgroundColor: "white", borderRadius: "1rem", width: "100%", maxWidth: "64rem", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden", color: "#333", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)" }}>
        
        {/* Header */}
        <div style={{ padding: "1.5rem", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#f9fafb" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold" }}>
              {MOCK_STUDENT.firstName} {MOCK_STUDENT.lastName}
            </h2>
            <div style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem", display: "flex", gap: "0.5rem" }}>
              <span style={{ display: "inline-block", padding: "0.25rem 0.5rem", backgroundColor: "#e0e7ff", color: "#4338ca", borderRadius: "9999px", fontWeight: 500 }}>
                Kat. {MOCK_STUDENT.studentProfile.licenseCategory}
              </span>
              <span style={{ display: "inline-block", padding: "0.25rem 0.5rem", backgroundColor: "#dcfce7", color: "#166534", borderRadius: "9999px", fontWeight: 500 }}>
                {MOCK_STUDENT.studentProfile.status}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ padding: "0.5rem 1rem", border: "1px solid #ccc", borderRadius: "0.5rem", background: "white", cursor: "pointer", fontWeight: "bold", color: "#333" }}
          >
            Zamknij
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "2rem", overflowY: "auto", flex: 1, backgroundColor: "#fff" }}>
          
          {/* Basic Info */}
          <section style={{ marginBottom: "2.5rem", border: "1px solid #eee", padding: "1.5rem", borderRadius: "0.75rem" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.25rem", color: "#111827" }}>Dane podstawowe</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", lineHeight: "1.5" }}>
              <div>
                <span style={{ display: "block", fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Email</span>
                <div style={{ padding: "0.5rem", backgroundColor: "#f9fafb", borderRadius: "0.375rem" }}>{MOCK_STUDENT.email}</div>
              </div>
              <div>
                <span style={{ display: "block", fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Telefon</span>
                <div style={{ padding: "0.5rem", backgroundColor: "#f9fafb", borderRadius: "0.375rem" }}>{MOCK_STUDENT.phoneNumber}</div>
              </div>
              <div>
                <span style={{ display: "block", fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Numer PKK</span>
                <div style={{ padding: "0.5rem", backgroundColor: "#f9fafb", borderRadius: "0.375rem" }}>{MOCK_STUDENT.studentProfile.pkkNumber}</div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={{ display: "block", fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Adres domowy</span>
                <div style={{ padding: "0.5rem", backgroundColor: "#f9fafb", borderRadius: "0.375rem" }}>{MOCK_STUDENT.studentProfile.homeAddress}</div>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <span style={{ display: "block", fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Notatki</span>
                <div style={{ padding: "0.5rem", backgroundColor: "#f9fafb", borderRadius: "0.375rem", minHeight: "60px" }}>{MOCK_STUDENT.studentProfile.notes}</div>
              </div>
            </div>
          </section>

          {/* Progress Section */}
          <section style={{ border: "1px solid #eee", padding: "1.5rem", borderRadius: "0.75rem" }}>
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.25rem", color: "#111827" }}>Postępy i Egzaminy</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", lineHeight: "1.5" }}>
              
              <div>
                <span style={{ display: "block", fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Wyjeżdżone minuty</span>
                <div style={{ padding: "0.5rem", backgroundColor: "#f9fafb", borderRadius: "0.375rem" }}>
                  {Math.floor(MOCK_STUDENT.studentProfile.drivenMinutes / 60)} godzin
                </div>
              </div>

              <div>
                <span style={{ display: "block", fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Teoria wewnętrzna</span>
                <div style={{ padding: "0.5rem", backgroundColor: MOCK_STUDENT.studentProfile.isInnerTheoryTestPassed ? "#dcfce7" : "#fee2e2", color: MOCK_STUDENT.studentProfile.isInnerTheoryTestPassed ? "#166534" : "#991b1b", borderRadius: "0.375rem" }}>
                  {MOCK_STUDENT.studentProfile.isInnerTheoryTestPassed ? 'Zdany' : 'Oczekuje'} (Próby: {MOCK_STUDENT.studentProfile.innerTheoryTestAttempts})
                </div>
              </div>

              <div>
                <span style={{ display: "block", fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Teoria państwowa</span>
                <div style={{ padding: "0.5rem", backgroundColor: MOCK_STUDENT.studentProfile.isTheoryTestPassed ? "#dcfce7" : "#fee2e2", color: MOCK_STUDENT.studentProfile.isTheoryTestPassed ? "#166534" : "#991b1b", borderRadius: "0.375rem" }}>
                  {MOCK_STUDENT.studentProfile.isTheoryTestPassed ? 'Zdany' : 'Oczekuje'} (Próby: {MOCK_STUDENT.studentProfile.theoryTestAttempts})
                </div>
              </div>

              <div>
                <span style={{ display: "block", fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Praktyka państwowa</span>
                <div style={{ padding: "0.5rem", backgroundColor: MOCK_STUDENT.studentProfile.isPracticalTestPassed ? "#dcfce7" : "#fee2e2", color: MOCK_STUDENT.studentProfile.isPracticalTestPassed ? "#166534" : "#991b1b", borderRadius: "0.375rem" }}>
                  {MOCK_STUDENT.studentProfile.isPracticalTestPassed ? 'Zdany' : 'Oczekuje'} (Próby: {MOCK_STUDENT.studentProfile.practicalTestAttempts})
                </div>
              </div>

            </div>
          </section>

        </div>
      </div>
      </VaporizeDev>
    </div>
  )
}
