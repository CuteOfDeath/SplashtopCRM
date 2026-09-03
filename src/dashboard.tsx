import { Container, Nav, Navbar, Table } from "react-bootstrap"

export default function Dashboard() {
    return (
        <>
            <Navbar expand="lg" className="bg-body-tertiary">
                <Container>
                    <Navbar.Brand href="#">Cemit</Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="me-auto">
                            <Nav.Link href="#">Importuj CSV</Nav.Link>
                            <Nav.Link href="#">Dodaj Aktywność</Nav.Link>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>
            <Table>

            </Table>
        </>
    )
}