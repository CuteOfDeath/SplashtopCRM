import { Fragment, useEffect, useState } from "react"
import { Button, Container, Dropdown, ListGroup, Nav, Navbar, Offcanvas, Table } from "react-bootstrap"

//TODO: Implement sorting. Implement a way to upload CSV files. Implement task assigning. Do visual touch ups


interface RecordRow {
    "ID": number
    "Nazwa": string
    "Nazwa Urządzenia": string
    "Nazwa Klienta": string
    "System Operacyjny": string
    "Wersja Streamera": string
    "Adres IP"?: string
    "Ostatnia Sesja": string
    "Ostatnio Online": string
    "Ostatnio Zalogowany"? : string,
    "Adres IP LAN"? : string
    "Notatka"?: string
}

interface Filter {
    Column : string
    Filter: string
}

interface TableQueryResult {
    success: boolean
    table?: string
    error?: string
    result?: RecordRow[]
}

export default function Dashboard() {
    const [loading, setLoading] = useState<boolean>(true)
    const [tableRange, setTableRange] = useState<[number, number]>([0, 50])
    const [displayTable, setDisplayTable] = useState<RecordRow[] | undefined>(undefined)
    const [showOffCanvas, setShowOffCanvas] = useState<boolean>(false)
    const [currentTable, setCurrentTable] = useState<string | undefined>(undefined)
    const [currentRecordInfo, setCurrentRecordInfo] = useState<RecordRow | undefined>(undefined)
    const [currentFilters, setCurrentFilters] = useState<Filter[]>([])
    const [currentSort, setCurrentSort] = useState<boolean>(true) //false = desc, true = asc
    const VisibleInfo = ["ID","Nazwa","Nazwa Urządzenia","Nazwa Klienta", "System Operacyjny", "Wersja Streamera", "Ostatnia Sesja", "Ostatnio Online"]


    async function loadTable() {
        if (currentTable == undefined){
            try {
                const response = await fetch("//127.0.0.1/CRM/api/view_latest_report.php", {
                    method: "GET"
                })
                const data: TableQueryResult = await response.json()
                setDisplayTable(data.result)
                setCurrentTable(data.table)
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }
    }

    async function handleDetailClick(id: number) {
        if (!showOffCanvas){
            try {
            const response = await fetch("//127.0.0.1/CRM/api/get_record.php", {
                method: "POST",
                body: JSON.stringify({
                    id: id,
                    table: currentTable
                })
            })
            const data: TableQueryResult = await response.json()
            if (!response.ok || !data.success) {
                throw new Error(data?.error)
            }
            setCurrentRecordInfo(data.result![0])
        } catch (error) {
            console.error(error)
        } finally {
            setShowOffCanvas(true)
        }
        }
    }

    async function handleFilter(column : string, filter: string) {
        let thisFilter: Filter = {
            Column: column,
            Filter: filter,
        }
        let localcurrentFilters: Filter[] = [...currentFilters, thisFilter]
        currentFilters.forEach(filter => {
            if(filter.Column == thisFilter.Column){
                if(filter.Filter == thisFilter.Filter){
                    throw new Error("Already filtering for this.")
                }else{
                    localcurrentFilters = [...currentFilters.filter(filter => filter.Column != thisFilter.Column), thisFilter]
                }
            }
        });
        let filteredcolumns: Record<string,string> = {}
        localcurrentFilters.forEach(filters => {
            filteredcolumns[filters.Column as keyof typeof filteredcolumns] = filters.Filter
        });
        setLoading(true)
        try {
            const response = await fetch("//127.0.0.1/CRM/api/get_filtered_table.php", {
                method: "POST",
                body: JSON.stringify({
                    table: currentTable,
                    columns: filteredcolumns,
                    sort: currentSort,
                    range: tableRange,
                })
            })
            const data: TableQueryResult = await response.json()
            if (!response.ok || !data.success) {
                throw new Error(data?.error)
            }
            console.log(data)
            setDisplayTable(data.result)
        } catch (error) {
            console.error(error)
        } finally {
            setCurrentFilters(localcurrentFilters)
            setLoading(false)
        }
    }

    function handleDetailHide(){
        setShowOffCanvas(false)
    }

    // fetch once on mount
    useEffect(() => {
        if (!displayTable) {
            void loadTable()
        }
    }, [])

    return (
        <>
            <Navbar expand="lg" className="bg-body-tertiary">
                <Container>
                    <Navbar.Brand href="#">Cemit CRM</Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav" />
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="me-auto">
                            <Nav.Link href="#">Importuj CSV</Nav.Link>
                            <Nav.Link href="#">Dodaj Aktywność</Nav.Link>
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>
            <Container>
                {loading && <p>Ładowanie...</p>}

                {!loading && displayTable && (
                    <>
                        <Table striped bordered hover>
                            <thead>
                                <tr>
                                    {VisibleInfo.map((element, index) => (
                                        <Fragment key={index}>
                                            {element != "ID" && (
                                            <th>
                                                <Dropdown>
                                                    <Dropdown.Toggle variant="success" id={`dropdown-${element}`}>
                                                        {element}
                                                    </Dropdown.Toggle>

                                                    <Dropdown.Menu>
                                                        <Dropdown.Item href="#/action-1">Action</Dropdown.Item>
                                                        <Dropdown.Item href="#/action-2">Another action</Dropdown.Item>
                                                        <Dropdown.Item href="#/action-3">Something else</Dropdown.Item>
                                                    </Dropdown.Menu>
                                                </Dropdown>
                                            </th>
                                            )}
                                            {element == "ID" && (
                                                <th>
                                                    <Button variant="success" onClick={() => {
                                                        void handleFilter("Nazwa Klienta","Cemit")
                                                    }}>ID</Button>
                                                </th>
                                            )}
                                        </Fragment>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {displayTable.map((row, index) => (
                                    <tr key={index} onClick={() => {
                                        void handleDetailClick(row["ID"])
                                    }}>
                                        {VisibleInfo.map((element, index) => (
                                            <td key={index}>{row[element as keyof RecordRow]}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                        <Offcanvas show={showOffCanvas} onHide={handleDetailHide}>
                                <Offcanvas.Header closeButton>
                                    <Offcanvas.Title>{currentRecordInfo?.Nazwa}</Offcanvas.Title>
                                </Offcanvas.Header>
                                <Offcanvas.Body>
                                    <ListGroup>
                                        <ListGroup.Item>Nazwa: {currentRecordInfo?.Nazwa}</ListGroup.Item>
                                        <ListGroup.Item>Nazwa Urządzenia: {currentRecordInfo?.["Nazwa Urządzenia"]}</ListGroup.Item>
                                        <ListGroup.Item>Nazwa Klienta: {currentRecordInfo?.["Nazwa Klienta"]}</ListGroup.Item>
                                        <ListGroup.Item>System Operacyjny: {currentRecordInfo?.["System Operacyjny"]}</ListGroup.Item>
                                        <ListGroup.Item>Wersja Streamera: {currentRecordInfo?.["Wersja Streamera"]}</ListGroup.Item>
                                        <ListGroup.Item>Adres IP: {currentRecordInfo?.["Adres IP"]}</ListGroup.Item>
                                        <ListGroup.Item>Data ostatniej sesji: {currentRecordInfo?.["Ostatnia Sesja"]}</ListGroup.Item>
                                        <ListGroup.Item>Data ostatniego zalogowania: {currentRecordInfo?.["Ostatnio Online"]}</ListGroup.Item>
                                        <ListGroup.Item>Email ostatniego zalogowanego użytkownika: {currentRecordInfo?.["Ostatnio Zalogowany"]}</ListGroup.Item>
                                        <ListGroup.Item>Adres IP LAN: {currentRecordInfo?.["Adres IP LAN"]}</ListGroup.Item>
                                    </ListGroup>
                                    <p>Notatka:<br/>
                                        {currentRecordInfo?.Notatka}
                                    </p>
                                </Offcanvas.Body>
                        </Offcanvas>
                    </>
                )}
            </Container>
        </>
    )
}
