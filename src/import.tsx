import { Link, useNavigate } from "react-router-dom";
import { useState, type ChangeEvent, useRef, useEffect } from "react"
import { Navbar, Container, Nav, Form, Button } from "react-bootstrap";
import "./styles/bootstrap.min.css";

export default function ImportCSV() {
    const [file, setFile] = useState<File | null>(null);
    const [status, setStatus] = useState<string>("idle")
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string>("");
    const navigate = useNavigate()
    const inputRef = useRef<HTMLInputElement>(null);
    
    function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
        const selected = e.target.files?.[0] ?? null;
        setFile(selected);
        setError("");
    }


    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    try{
        if (!file) {
        throw new Error("Błąd: Najpierw wybierz plik CSV")
        }
    }catch(err){
        setError(err instanceof Error ? err.message : "Coś poszło nie tak przy wysyłaniu CSV")
        setStatus("error")
        return
    }

    const formData = new FormData();
    formData.append("csv_file", file);

    setError("");
    setLoading(true)
    try {
      const res = await fetch("//127.0.0.1/CRM/api/import_csv.php", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        const message = !data.success ? data.error : `Upload failed (${res.status})`;
        throw new Error(message);
      }
      setStatus("success")
    }catch (err){
        setError(err instanceof Error ? err.message : "Coś poszło nie tak przy wysyłaniu CSV")
        setStatus("error")
    }finally{
        setLoading(false)
    }
    }
    useEffect(() => {
        if (status == "success") {
            navigate("/")
        }
    },[status])

    return (
        <>
            <Navbar expand="lg" className="navbar navbar-expand-lg bg-primary" data-bs-theme="dark" style={{borderRadius: "10px", margin: "20px"}}>
                <Container>
                    <Navbar.Brand as={Link} to={"/crmstrona/"}>Cemit CRM</Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="me-auto">
                            <Nav.Link as={Link} to={"/crmstrona/import"}>Importuj CSV</Nav.Link>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>
            <Container className="bg-secondary" style={{padding: "3%", borderRadius:"4px"}}>
                <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                        <Form.Label>Plik CSV</Form.Label>
                        <Form.Control type="file" ref={inputRef} accept=".csv,text/csv" onChange={handleFileChange}/>
                        <Form.Text className="text-muted">
                        Wyślij plik CSV otrzymany z exportu Splashtopa
                        </Form.Text>
                    </Form.Group>
                    <Button variant="primary" type="submit" disabled={loading}>
                        Wyślij
                    </Button>
                </Form>
                {status == "success" && (
                    <p className="bg-success" style={{color:"white", padding:"4px", margin:"10px",borderRadius: "4px"}}>Pomyślnie wysłano tabelę CSV</p>
                )}
                {status == "error" && (
                 <p className="bg-danger" style={{color:"white", padding:"4px", margin:"4%",borderRadius: "4px"}}>{error}</p>
                )}
            </Container>
        </>
    )
}